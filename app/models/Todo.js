const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TodoSchema = new Schema({
    task: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    completed: {
        type: Boolean,
        default: false
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
    },
    category: {
        type: String,
        trim: true
    },
    dueDate: {
        type: Date
    },
    tags: [{
        type: String,
        trim: true
    }],
    created_at: {
        type: Date,
        default: Date.now
    },
    updated_at: {
        type: Date,
        default: Date.now
    }
});

// Update the updated_at field before saving
TodoSchema.pre('save', function(next) {
    this.updated_at = Date.now();
    next();
});

module.exports = Todo = mongoose.model('todos', TodoSchema);