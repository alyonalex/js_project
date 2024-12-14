const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path');
const app = express();

// Подключение к MongoDB
mongoose.connect('mongodb://localhost:27017/notes_app')
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));

// Модели
const User = require('./models/User');
const Category = require('./models/Category');
const Note = require('./models/Note');
const Statistics = require('./models/Statistics');

// Настройки Express
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));

// Обновление статистики
const updateStatistics = async () => {
    const userStats = await User.aggregate([
        {
            $lookup: {
                from: 'notes', 
                localField: '_id',
                foreignField: 'user_id',
                as: 'notes'
            }
        },
        {
            $project: {
                _id: 1,
                user_name: '$name',
                notes_count: { $size: '$notes' } // Считаем количество заметок
            }
        }
    ]);

    const statisticsData = { user_statistics: userStats };
    await mongoose.connection.collection('statistics').replaceOne({}, statisticsData, { upsert: true });
};


// Главная страница
app.get('/', async (req, res) => {
    const { user_id, category_id, sort_by } = req.query;

    let notesQuery = Note.find();

    // Фильтрация по пользователю
    if (user_id) {
        notesQuery = notesQuery.where('user_id').equals(user_id);
    }

    // Фильтрация по категории
    if (category_id) {
        notesQuery = notesQuery.where('category_id').equals(category_id);
    }

    // Сортировка
    if (sort_by === 'user') {
        notesQuery = notesQuery.sort('user_name');
    } else if (sort_by === 'category') {
        notesQuery = notesQuery.sort('category_name');
    }

    const notes = await notesQuery.exec();

    // Получение статистики для всех пользователей
    const userStats = await User.aggregate([
        {
            $lookup: {
                from: 'notes',
                localField: '_id',
                foreignField: 'user_id',
                as: 'notes'
            }
        },
        {
            $project: {
                _id: 1,
                user_name: '$name',
                notes_count: { $size: '$notes' }
            }
        }
    ]);

    const categories = await Category.find();
    const users = await User.find();

    res.render('index', {
        statistics: { user_statistics: userStats },
        categories,
        users,
        notes,
        user_id,
        category_id,
        sort_by
    });
});


// Управление пользователями
app.get('/users', async (req, res) => {
    const users = await User.find();
    res.render('manage_users', { users });
});

app.post('/users', async (req, res) => {
    const { name, email } = req.body;
    await User.create({ name, email });
    res.redirect('/users');
});

app.get('/users/:id/edit', async (req, res) => {
    const user = await User.findById(req.params.id);
    res.render('edit_user', { user });
});

app.post('/users/:id/edit', async (req, res) => {
    const { name, email } = req.body;

    // Обновляем пользователя
    const user = await User.findByIdAndUpdate(req.params.id, { name, email }, { new: true });

    if (user) {
        // Обновляем имя пользователя в связанных заметках
        await Note.updateMany({ user_id: user._id }, { user_name: user.name });

        // Обновляем статистику
        await updateStatistics();
    }

    res.redirect('/users');
});

app.post('/users/:id/delete', async (req, res) => {
    await Note.deleteMany({ user_id: req.params.id });
    await User.findByIdAndDelete(req.params.id);
    await updateStatistics();
    res.redirect('/users');
});

// Управление категориями
app.get('/categories', async (req, res) => {
    const categories = await Category.find();
    res.render('manage_categories', { categories });
});

app.post('/categories', async (req, res) => {
    const { name } = req.body;
    await Category.create({ name });
    res.redirect('/categories');
});

app.get('/categories/:id/edit', async (req, res) => {
    const category = await Category.findById(req.params.id);
    res.render('edit_category', { category });
});

app.post('/categories/:id/edit', async (req, res) => {
    const { name } = req.body;
    await Category.findByIdAndUpdate(req.params.id, { name });
    res.redirect('/categories');
});

app.post('/categories/:id/delete', async (req, res) => {
    await Note.deleteMany({ category_id: req.params.id });
    await Category.findByIdAndDelete(req.params.id);
    res.redirect('/categories');
});

// Управление заметками
app.get('/notes', async (req, res) => {
    const notes = await Note.find();
    const users = await User.find();
    const categories = await Category.find();
    res.render('manage_notes', { notes, users, categories });
});

app.post('/notes', async (req, res) => {
    const { user_id, category_id, content } = req.body;
    const user = await User.findById(user_id);
    const category = await Category.findById(category_id);

    await Note.create({
        user_id,
        user_name: user.name,
        category_id,
        category_name: category.name,
        content
    });

    await updateStatistics();
    res.redirect('/notes');
});

app.get('/notes/:id/edit', async (req, res) => {
    const note = await Note.findById(req.params.id);
    const users = await User.find();
    const categories = await Category.find();
    res.render('edit_note', { note, users, categories });
});

app.post('/notes/:id/edit', async (req, res) => {
    const { content, category_id } = req.body;
    const category = await Category.findById(category_id);

    await Note.findByIdAndUpdate(req.params.id, {
        content,
        category_id,
        category_name: category.name
    });

    res.redirect('/notes');
});

app.post('/notes/:id/delete', async (req, res) => {
    await Note.findByIdAndDelete(req.params.id);
    await updateStatistics();
    res.redirect('/notes');
});

// Запуск сервера
app.listen(3000, () => {
    console.log('Server running at http://localhost:3000');
});
