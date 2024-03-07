const { telegramConfig } = require('./server/configs');
const TelegramBot = require( 'node-telegram-bot-api');
const {Avito, States} = require("./server/helpers");


const bot = new TelegramBot(telegramConfig.botToken, { polling: true })
bot.setMyCommands([
    {
        command: "menu",
        description: "Меню"
    }
]);

let avito = new Avito();
let states = new States()

bot.on('text', async msg => {
    try {
        if(msg.text.startsWith('/start')) {
            await bot.sendMessage(msg.chat.id, `Вы запустили бота!`);
            await openMenu(msg);
        }
        else if(msg.text === '/menu') {
            await openMenu(msg);
            await states.deleteStatesToUser(msg.from.id)
        }
        else if(msg.text === telegramConfig.title.mySearches) {
            let tasks = await avito.getTasksToUser(msg.from.id)
            let reformatTask = tasks.map((task) => {return {text: task.name, url: task.url}})
            await bot.sendMessage(msg.chat.id, "Поиски", {
                    reply_markup:
                        {
                            inline_keyboard: splitTasksToView(reformatTask)
                        }
                }
            );
            await states.deleteStatesToUser(msg.from.id)
        }
        else if(msg.text === telegramConfig.title.deleteSearch) {
            await states.deleteStatesToUser(msg.from.id)
            let tasks = await avito.getTasksToUser(msg.from.id)
            let reformatTask = tasks.map((task) => {return {text: task.name, callback_data: task.id}})
            await bot.sendMessage(msg.chat.id, "Поиски", {
                    reply_markup:
                        {
                            inline_keyboard: splitTasksToView(reformatTask)
                        }
                }
            );
            await states.addStatesToUser(msg.from.id, telegramConfig.title.deleteSearch)
        }
        else if(msg.text === telegramConfig.title.addSearch)
        {
            await states.deleteStatesToUser(msg.from.id)
            await bot.sendMessage(msg.chat.id, "Введите ссылку для мониторинга:");
            await states.addStatesToUser(msg.from.id, telegramConfig.title.addSearch)
        }
        else if(msg.text === telegramConfig.title.info) {
            await bot.sendMessage(msg.chat.id,
                `Ваш ID: ${msg.from.id}\nЕсли возникли вопросы - обращаться к @sirllizz`
            );
        }
        else {
            let currentUserStates = await states.getStatesToUser(msg.from.id)
            if(currentUserStates.length === 1 && currentUserStates[0].state === telegramConfig.title.addSearch){
                if(checkAvitoPath(msg.text)){
                    await bot.sendMessage(msg.chat.id, telegramConfig.title.addSearchName);
                    await states.addStatesToUser(msg.from.id, telegramConfig.title.addSearchName, msg.text)
                }else{
                    await bot.sendMessage(msg.chat.id, "Ссылка некорректна");
                    await states.deleteStatesToUser(msg.from.id)
                    await openMenu(msg)
                }
            }
            else if(currentUserStates.length === 2 &&
                (currentUserStates[0].state === telegramConfig.title.addSearch &&
                    currentUserStates[1].state === telegramConfig.title.addSearchName &&
                    checkAvitoPath(currentUserStates[1].value))||
                (currentUserStates[1].state === telegramConfig.title.addSearch &&
                    currentUserStates[0].state === telegramConfig.title.addSearchName &&
                    checkAvitoPath(currentUserStates[0].value))){
                let task;

                if(checkAvitoPath(currentUserStates[1].value))
                {
                    task = {
                        user_id: msg.from.id,
                        id: msg.message_id,
                        name: msg.text,
                        url: currentUserStates[1].value
                    }
                }else{
                    task = {
                        user_id: msg.from.id,
                        id: msg.message_id,
                        name: msg.text,
                        url: currentUserStates[0].value
                    }
                }
                try{
                    await avito.addTasksToUser(task)
                    await bot.sendMessage(msg.chat.id, "Ссылка добавлена");
                }catch{
                    console.log("При добавлении не прогрузились ad")
                }
                await states.deleteStatesToUser(msg.from.id)
            }
            else{
                await bot.sendMessage(msg.chat.id, "Нераспознаная команда");
                await states.deleteStatesToUser(msg.from.id)
            }
        }
    }
    catch(error) {
        console.log(error);
    }
})

bot.on('callback_query', async ctx => {
    try {
        let currentUserStates = await states.getStatesToUser(ctx.from.id)
        if(ctx.data === "closeMenu") {
            await bot.deleteMessage(ctx.message.chat.id, ctx.message.message_id);
            await states.deleteStatesToUser(ctx.from.id)
        }
        else if(currentUserStates.length === 1 && currentUserStates[0].state === telegramConfig.title.deleteSearch){
            await avito.deleteTasksToUser(ctx.from.id, ctx.data)
            await bot.deleteMessage(ctx.message.chat.id, ctx.message.message_id);
            await states.deleteStatesToUser(ctx.from.id)
        }
    }
    catch(error) {
        console.log(error);
    }
})

async function openMenu(msg) {
    await bot.sendMessage(msg.chat.id, "Меню открыто", {
        reply_markup: {
            keyboard: [
                [telegramConfig.title.mySearches, telegramConfig.title.addSearch],
                [telegramConfig.title.deleteSearch, telegramConfig.title.info]
            ],
            resize_keyboard: true
        }
    })
}

function splitTasksToView(tasks) {
    let chunkSize = 3
    let splitTasks = Array.from({ length: Math.ceil(tasks.length / chunkSize) }, (_, index) =>
        tasks.slice(index * chunkSize, (index + 1) * chunkSize)
    );
    splitTasks.push([{text: 'Закрыть Меню', callback_data: 'closeMenu'}])
    return splitTasks
}

function checkAvitoPath(url) {
    let pattern = /https:\/\/www\.avito\.ru\/[^\/]+\/[^\/]+/;
    return pattern.test(url)
}

async function notifyUser(ad){
    const text = `
Появился новый товар

${ad.title}

Цена: ${ad.price}руб
Ссылка на объявление: ${ad.ad_link}
`;
    if(ad.photo_link != null){
        await bot.sendPhoto(ad.user_id, ad.photo_link, {
            caption: text
        });
    }else{
        await bot.sendMessage(ad.user_id, text);
    }

}

async function checkAd(){
    let ads = await avito.checkAllAds()
    for(const ad of ads) {
        await notifyUser(ad)
    }
    setTimeout(async () => await checkAd(), 10)
}

//setInterval(async () => await checkAd(), 60000);

setTimeout(async () => await checkAd(), 60000)