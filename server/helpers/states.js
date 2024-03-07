const Database = require('./database');

class States {
    constructor() {
        this.db = new Database()
    }
    async getStatesToUser(userId){
        return await this.db.getStatesToUser(userId);
    }

    async addStatesToUser(userId, state, value){
        value = value === undefined? " " : value
        await this.db.addStatesToUser(userId, state, value);
    }

    async deleteStatesToUser(userId){
        await this.db.deleteStatesToUser(userId);
    }
}
module.exports = States;