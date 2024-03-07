const Database = require('./database');
const puppeteer = require('puppeteer')

class Avito {
    constructor() {
        this.db = new Database()
    }
    
    async getTasksToUser(userId){
        return await this.db.getTasksForUser(userId);
    }

    async addTasksToUser(task){
        await this.db.addTaskForUser(task);
        let browser = await puppeteer.launch()
        let ads = await this.getAdsToTask(task, browser);
        browser.close()
        await this.db.addAdToUserTask(task.user_id, task.id, ads)
    }

    async deleteTasksToUser(userId, taskId){
        await this.db.deleteTaskForUser(userId, taskId);
        await this.db.deleteAdToUserByTask(userId, taskId);
    }

    async checkAllAds(){
        let tasks = await this.db.getAllTasks();
        let browser = await puppeteer.launch();
        let ads_to_users = [];

        try{
            for (const [id, task] of Object.entries(tasks)) {
                let ads_new = await this.getAdsToTask(task, browser);
                let ads_new_arr = Object.keys(ads_new);
                let ads_db_arr = Object.keys(await this.db.getAdToUserTask(task.user_id, task.id))
                let difference = ads_new_arr.filter(x => !ads_db_arr.includes(x));
                if(difference.length > 0 && difference.length < 50){
                    await this.db.deleteAdToUserByTask(task.user_id, task.id);
                    await this.db.addAdToUserTask(task.user_id, task.id, ads_new);
                    for (const ad_id of difference) {
                        let ad_to_user = ads_new[ad_id]
                        const result = { user_id: task.user_id,
                                            title: ad_to_user.title,
                                            ad_link: ad_to_user.ad_link, 
                                            price: ad_to_user.price,
                                            photo_link: ad_to_user.photo_link};
                        ads_to_users.push(result)
                    }
                }
            }
        }
        catch{
            console.log("Проблемки...")
        }
        finally
        {
            browser.close()
        }
        return ads_to_users;
    }

    async getAdsToTask(task, browser){
        const page = await browser.newPage();
        let currDate = new Date()
        await page.goto(task.url, {waitUntil: 'load', timeout: 0});
        console.log((new Date().getTime() - currDate.getTime())/1000 + "сек")

        await page.waitForSelector("[data-marker='item-title']");

        let arr = await page.evaluate(() => {

            let data = {}
            let ads = document.querySelectorAll("[data-marker='item']")

            for (const ad of ads) {
                const id = ad.id;
                const title = ad.querySelector("[data-marker='item-title']").title;
                const ad_link = ad.querySelector("[data-marker='item-title']").href;
                const price = ad.querySelector("[itemprop='price']").content; 
                const photo = ad.querySelector("[itemprop='image']");             
                const result = { title: title, ad_link: ad_link, price: price, photo_link: photo==null?null:photo.url };
                data[id] = result
            }
            return data
        });
        return arr;
    }     
}
module.exports = Avito;