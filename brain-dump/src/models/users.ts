import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  userid: string; // unique identifier (e.g., from GitHub)
  name: string;
  email: string;
  password?: string; // null for OAuth users
  image?: string;
  githubId?: string;
  isVerified: boolean;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    userid: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String }, // hashed, optional
    image: { type: String },
    githubId: { type: String },
    isVerified: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const User = mongoose.models.User || mongoose.model("User", UserSchema);
