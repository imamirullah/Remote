import mongoose, { Schema, model, Document } from 'mongoose';

export interface InvitationDocument extends Document {
  token: string;
  createdBy: string;
  createdAt: Date;
  expiresAt: Date;
}

const InvitationSchema = new Schema<InvitationDocument>({
  token: { type: String, required: true, unique: true, index: true },
  createdBy: { type: String, required: true },
  expiresAt: { type: Date, required: true },
}, { timestamps: true });

const InvitationMongooseModel = model<InvitationDocument>('Invitation', InvitationSchema);

// In-Memory fallback store
const inMemoryInvitations = new Map<string, any>();

const mockInvitationModel: any = {
  findOne: async (query: any) => {
    if (mongoose.connection.readyState === 1) {
      return InvitationMongooseModel.findOne(query);
    }
    return inMemoryInvitations.get(query.token) || null;
  },
  create: async (data: any) => {
    if (mongoose.connection.readyState === 1) {
      return InvitationMongooseModel.create(data);
    }
    const newInvite = {
      _id: new mongoose.Types.ObjectId(),
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
      save: async function() { return this; }
    };
    inMemoryInvitations.set(data.token, newInvite);
    return newInvite;
  },
  findOneAndDelete: async (query: any) => {
    if (mongoose.connection.readyState === 1) {
      return InvitationMongooseModel.findOneAndDelete(query);
    }
    const invite = inMemoryInvitations.get(query.token);
    if (invite) {
      inMemoryInvitations.delete(query.token);
    }
    return invite || null;
  }
};

export const InvitationModel = mockInvitationModel as any;
export default InvitationModel;
