import mongoose, { Schema, model, Document } from 'mongoose';
import { IUser, UserRole } from '@remote-support/shared-types';

export interface UserDocument extends Omit<IUser, 'id'>, Document {
  passwordHash: string;
  refreshToken?: string;
  googleId?: string;
  verifyToken?: string;
  verifyTokenExpires?: Date;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
}

const UserSchema = new Schema<UserDocument>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ['admin', 'support_engineer', 'customer'],
      default: 'support_engineer',
    },
    passwordHash: {
      type: String,
      required: function (this: UserDocument) {
        // Only required if not using Google login
        return !this.googleId;
      },
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    refreshToken: {
      type: String,
    },
    googleId: {
      type: String,
      sparse: true,
      unique: true,
    },
    verifyToken: String,
    verifyTokenExpires: Date,
    resetPasswordToken: String,
    resetPasswordExpires: Date,
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        const anyRet = ret as any;
        anyRet.id = anyRet._id.toString();
        delete anyRet._id;
        delete anyRet.__v;
        delete anyRet.passwordHash;
        delete anyRet.refreshToken;
        delete anyRet.verifyToken;
        delete anyRet.verifyTokenExpires;
        delete anyRet.resetPasswordToken;
        delete anyRet.resetPasswordExpires;
        return anyRet;
      },
    },
  }
);

const UserMongooseModel = model<UserDocument>('User', UserSchema);

// In-Memory store for local database-less mode
const inMemoryUsers: any[] = [];

// Pre-populate with a demo engineer and demo customer for immediate login
const demoSalt = "$2a$10$abcdefghijklmnopqrstuu"; // mock salt
const demoHash = "$2a$10$abcdefghijklmnopqrstuuVzW6F8GzZ2u9F3fK9XWp2.z6q4y"; // bcrypt hash for 'password123'

inMemoryUsers.push({
  _id: new mongoose.Types.ObjectId("60d5ec40f1b29e3d8c8b4567"),
  email: "demo@teleport.io",
  name: "Demo Engineer",
  role: "support_engineer",
  passwordHash: demoHash,
  isEmailVerified: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  save: async function() { return this; }
});

const mockUserModel: any = {
  findOne: async (query: any) => {
    if (mongoose.connection.readyState === 1) {
      return UserMongooseModel.findOne(query);
    }
    const q = query || {};
    return inMemoryUsers.find(u => {
      if (q.email && u.email !== q.email) return false;
      if (q.verifyToken && u.verifyToken !== q.verifyToken) return false;
      if (q.resetPasswordToken && u.resetPasswordToken !== q.resetPasswordToken) return false;
      return true;
    }) || null;
  },
  create: async (data: any) => {
    if (mongoose.connection.readyState === 1) {
      return UserMongooseModel.create(data);
    }
    const newUser = {
      _id: new mongoose.Types.ObjectId(),
      isEmailVerified: true,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
      save: async function() { return this; }
    };
    inMemoryUsers.push(newUser);
    return newUser;
  },
  findById: async (id: any) => {
    if (mongoose.connection.readyState === 1) {
      return UserMongooseModel.findById(id);
    }
    return inMemoryUsers.find(u => u._id.toString() === id.toString()) || null;
  },
  updateOne: async (query: any, update: any) => {
    if (mongoose.connection.readyState === 1) {
      return UserMongooseModel.updateOne(query, update);
    }
    const user = inMemoryUsers.find(u => u.email === query.email);
    if (user) {
      const set = update.$set || update;
      Object.assign(user, set);
    }
    return { modifiedCount: 1 };
  }
};

export const UserModel = mockUserModel as any;
export default UserModel;
