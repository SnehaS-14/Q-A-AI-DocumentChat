import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  filename: { type: String, required: true },
  text: { type: String, required: true },
  charCount: { type: Number, required: true },
  fileSize: { type: Number, required: true },
  fileType: { type: String, required: true },
  filePath: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now },
  sessionId: { type: String, required: true, index: true },
});

export default mongoose.model('Document', documentSchema);
