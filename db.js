const Sequelize = require('sequelize');
const sequelize = new Sequelize("mysql://root@localhost:3306/delilah_database");

const db = {
    sequelize: sequelize,
    Sequelize: Sequelize,
};

module.exports = db;