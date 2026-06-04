import mongoose, { Schema, Document } from "mongoose";

export interface IChatMessage {
  role: "user" | "assistant";
  content: string;
  usedRAG: boolean;
  sources: string[]; // MongoDB Source _id strings
  createdAt: Date;
}

export interface IChatSession extends Document {
  userId: string;
  title: string;
  messages: IChatMessage[];
  createdAt: Date;
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

const ChatSessionSchema = new Schema<IChatSession>(
  {
    userId: { type: String, required: true, index: true },
    title: { type: String, required: true, default: "New Chat" },
    messages: [ChatMessageSchema],
  },
  { timestamps: true },
);

export const ChatSession =
  mongoose.models.ChatSession ||
  mongoose.model<IChatSession>("ChatSession", ChatSessionSchema);
