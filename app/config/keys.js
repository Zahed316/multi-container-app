// Prefer environment variable when provided, fallback to docker service default
const mongoProdURI = process.env.MONGO_URI || 'mongodb://todo-database:27017/todoapp';

module.exports = {
    mongoProdURI,
};