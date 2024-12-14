const mongoose = require('mongoose');

const NoteSchema = new mongoose.Schema({
    user_id: mongoose.Schema.Types.ObjectId,
    user_name: String,
    category_id: mongoose.Schema.Types.ObjectId,
    category_name: String,
    content: String
});

module.exports = mongoose.model('Note', NoteSchema);
