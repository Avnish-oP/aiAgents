import mongoose, { Schema, Document } from "mongoose";

export type SourceType = "pdf" | "docx" | "text" | "youtube" | "website";
export type SourceStatus = "pending" | "processing" | "ready" | "failed";

export interface ISource extends Document {
  userId: string;
  type: SourceType;
  title: string;
  url?: string;
  filename?: string;
  status: SourceStatus;
  chunkCount: number;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SourceSchema = new Schema<ISource>(
  {
    userId: { type: String, required: true, index: true },
    type: {
      type: String,
      required: true,
      enum: ["pdf", "docx", "text", "youtube", "website"],
    },
    title: { type: String, required: true },
    url: { type: String },
    filename: { type: String },
    status: {
      type: String,
      required: true,
      enum: ["pending", "processing", "ready", "failed"],
      default: "pending",
    },
    chunkCount: { type: Number, default: 0 },
    errorMessage: { type: String },
  },
  { timestamps: true },
);

export const Source =
  mongoose.models.Source || mongoose.model<ISource>("Source", SourceSchema);
