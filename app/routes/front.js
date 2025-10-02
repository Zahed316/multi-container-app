const express = require('express');
const Todo = require('./../models/Todo');

const router = express.Router();

// Home page route with search and filter
router.get('/', async (req, res) => {
    try {
        const { search, priority, category, status, sortBy } = req.query;
        
        // Build query object
        let query = {};
        
        // Search functionality
        if (search) {
            query.$or = [
                { task: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { tags: { $in: [new RegExp(search, 'i')] } }
            ];
        }
        
        // Filter by priority
        if (priority && priority !== 'all') {
            query.priority = priority;
        }
        
        // Filter by category
        if (category && category !== 'all') {
            query.category = { $regex: category, $options: 'i' };
        }
        
        // Filter by completion status
        if (status === 'completed') {
            query.completed = true;
        } else if (status === 'pending') {
            query.completed = false;
        }
        
        // Build sort object
        let sort = { created_at: -1 }; // Default sort
        if (sortBy === 'priority') {
            sort = { priority: 1, created_at: -1 };
        } else if (sortBy === 'dueDate') {
            sort = { dueDate: 1, created_at: -1 };
        } else if (sortBy === 'alphabetical') {
            sort = { task: 1 };
        }
        
        const todos = await Todo.find(query).sort(sort);
        
        // Get unique categories for filter dropdown
        const allCategories = await Todo.distinct('category');
        const categories = allCategories.filter(cat => cat && cat.trim() !== '');
        
        res.render("todos", {
            tasks: todos,
            error: req.query.error || null,
            success: req.query.success || null,
            filters: {
                search: search || '',
                priority: priority || 'all',
                category: category || 'all',
                status: status || 'all',
                sortBy: sortBy || 'newest'
            },
            categories: categories
        });
    } catch (error) {
        console.error('Error fetching todos:', error);
        res.render("todos", {
            tasks: [],
            error: 'Failed to load todos',
            success: null,
            filters: {
                search: '',
                priority: 'all',
                category: 'all',
                status: 'all',
                sortBy: 'newest'
            },
            categories: []
        });
    }
});

// POST - Submit Task
router.post('/', async (req, res) => {
    try {
        const { task, description, priority, category, dueDate, tags } = req.body;
        
        if (!task || task.trim() === '') {
            return res.redirect('/?error=Task is required');
        }

        const newTask = new Todo({
            task: task.trim(),
            description: description ? description.trim() : '',
            priority: priority || 'medium',
            category: category ? category.trim() : '',
            dueDate: dueDate || null,
            tags: tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag) : []
        });

        await newTask.save();
        const suffix = req.query.lang ? `&lang=${req.query.lang}` : '';
        res.redirect('/?success=Task added successfully' + suffix);
    } catch (error) {
        console.error('Error creating todo:', error);
        const suffix = req.query.lang ? `&lang=${req.query.lang}` : '';
        res.redirect('/?error=Failed to create task' + suffix);
    }
});

// POST - Update Task
router.post('/todo/update', async (req, res) => {
    try {
        const { _id, task, description, priority, category, dueDate, tags } = req.body;
        
        if (!task || task.trim() === '') {
            return res.redirect('/?error=Task is required');
        }

        const updatedTask = await Todo.findByIdAndUpdate(_id, {
            task: task.trim(),
            description: description ? description.trim() : '',
            priority: priority || 'medium',
            category: category ? category.trim() : '',
            dueDate: dueDate || null,
            tags: tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
            updated_at: Date.now()
        }, { new: true });

        if (!updatedTask) {
            return res.redirect('/?error=Task not found');
        }

        const suffix = req.query.lang ? `&lang=${req.query.lang}` : '';
        res.redirect('/?success=Task updated successfully' + suffix);
    } catch (error) {
        console.error('Error updating todo:', error);
        const suffix = req.query.lang ? `&lang=${req.query.lang}` : '';
        res.redirect('/?error=Failed to update task' + suffix);
    }
});

// POST - Toggle Complete Status
router.post('/todo/toggle', async (req, res) => {
    try {
        const { _id } = req.body;
        const todo = await Todo.findById(_id);
        
        if (!todo) {
            return res.redirect('/?error=Task not found');
        }

        todo.completed = !todo.completed;
        todo.updated_at = Date.now();
        await todo.save();

        const suffix = req.query.lang ? `&lang=${req.query.lang}` : '';
        res.redirect('/?success=Task status updated' + suffix);
    } catch (error) {
        console.error('Error toggling todo:', error);
        const suffix = req.query.lang ? `&lang=${req.query.lang}` : '';
        res.redirect('/?error=Failed to update task status' + suffix);
    }
});

// POST - Destroy todo item
router.post('/todo/destroy', async (req, res) => {
    try {
        const taskKey = req.body._key;
        const deletedTask = await Todo.findByIdAndDelete(taskKey);
        
        if (!deletedTask) {
            return res.redirect('/?error=Task not found');
        }

        const suffix = req.query.lang ? `&lang=${req.query.lang}` : '';
        res.redirect('/?success=Task deleted successfully' + suffix);
    } catch (error) {
        console.error('Error deleting todo:', error);
        const suffix = req.query.lang ? `&lang=${req.query.lang}` : '';
        res.redirect('/?error=Failed to delete task' + suffix);
    }
});

// GET - Edit form
router.get('/todo/edit/:id', async (req, res) => {
    try {
        const todo = await Todo.findById(req.params.id);
        if (!todo) {
            return res.redirect('/?error=Task not found');
        }
        res.render('edit-todo', { todo });
    } catch (error) {
        console.error('Error fetching todo for edit:', error);
        res.redirect('/?error=Failed to load task');
    }
});

// POST - Bulk operations
router.post('/todo/bulk', async (req, res) => {
    try {
        const { action, taskIds } = req.body;
        
        if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
            return res.redirect('/?error=No tasks selected');
        }
        
        let result;
        switch (action) {
            case 'complete':
                result = await Todo.updateMany(
                    { _id: { $in: taskIds } },
                    { completed: true, updated_at: Date.now() }
                );
                {
                    const suffix = req.query.lang ? `&lang=${req.query.lang}` : '';
                    res.redirect('/?success=' + result.modifiedCount + ' tasks marked as completed' + suffix);
                }
                break;
                
            case 'incomplete':
                result = await Todo.updateMany(
                    { _id: { $in: taskIds } },
                    { completed: false, updated_at: Date.now() }
                );
                {
                    const suffix = req.query.lang ? `&lang=${req.query.lang}` : '';
                    res.redirect('/?success=' + result.modifiedCount + ' tasks marked as incomplete' + suffix);
                }
                break;
                
            case 'delete':
                result = await Todo.deleteMany({ _id: { $in: taskIds } });
                {
                    const suffix = req.query.lang ? `&lang=${req.query.lang}` : '';
                    res.redirect('/?success=' + result.deletedCount + ' tasks deleted' + suffix);
                }
                break;
                
            case 'deleteCompleted':
                result = await Todo.deleteMany({ 
                    _id: { $in: taskIds },
                    completed: true 
                });
                {
                    const suffix = req.query.lang ? `&lang=${req.query.lang}` : '';
                    res.redirect('/?success=' + result.deletedCount + ' completed tasks deleted' + suffix);
                }
                break;
                
            default:
                res.redirect('/?error=Invalid bulk action');
        }
    } catch (error) {
        console.error('Error in bulk operation:', error);
        res.redirect('/?error=Failed to perform bulk operation');
    }
});

module.exports = router;