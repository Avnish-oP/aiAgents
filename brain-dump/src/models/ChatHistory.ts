import mongoose, { Schema, Document } from "mongoose";

export interface IChatMessage {
  role: "user" | "assistant";
  content: string;
  usedRAG: boolean;
  sources: string[]; // sourceIds
  createdAt: Date;
}

export interface IChatHistory extends Document {
  userId: string;
  messages: IChatMessage[];
  updatedAt: Date;
}

const ChatMessageSchema = new Schema<IChatMessage>(
  {
    role: { type: String, required: true, enum: ["user", "assistant"] },
    content: { type: String, required: true },
    usedRAG: { type: Boolean, default: false },
    sources: [{ type: String }],
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const ChatHistorySchema = new Schema<IChatHistory>(
  {
    userId: { type: String, required: true, unique: true, index: true },
    messages: [ChatMessageSchema],
  },
  { timestamps: true },
);

export const ChatHistory =
  mongoose.models.ChatHistory ||
  mongoose.model<IChatHistory>("ChatHistory", ChatHistorySchema);
