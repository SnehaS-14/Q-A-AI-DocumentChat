import mongoose from 'mongoose';

const chatSessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true },
  documentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Document' }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.model('ChatSession', chatSessionSchema);
