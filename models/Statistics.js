const mongoose = require('mongoose');

// Определение схемы для статистики
const StatisticsSchema = new mongoose.Schema({
    user_statistics: [
        {
            user_name: { type: String, required: true },
            notes_count: { type: Number, required: true }
        }
    ]
});

// Создание и экспорт модели
const Statistics = mongoose.model('Statistics', StatisticsSchema);
module.exports = Statistics;
