require('dotenv').config();

const telegram = {
  botToken: process.env.TELEGRAM_API_TOKEN,
  title: {
    mySearches : "🗃Мои поиски",
    addSearch: "🆕Добавить поиск",
    deleteSearch: "🗑Удалить поиск",
    info: "📲 Информация",
    addSearchName: "Введите название поиска",
    findEveryOneSecond: "Пиши мне сообщения каждую секунду"
  }
}
module.exports = telegram;

