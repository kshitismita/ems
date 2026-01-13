import mongoose from 'mongoose';

const TodoSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    text: {
        type: String,
        required: [true, 'Please provide todo text'],
        trim: true,
    },
    completed: {
        type: Boolean,
        default: false,
    },
}, {
    timestamps: true,
});

const Todo = mongoose.models.Todo || mongoose.model('Todo', TodoSchema);
export default Todo;
