import { Schema, model, Document } from 'mongoose';
import { ITeam } from '@remote-support/shared-types';

export interface TeamDocument extends Omit<ITeam, 'id'>, Document {}

const TeamSchema = new Schema<TeamDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    ownerId: {
      type: String,
      required: true,
      index: true,
    },
    members: [
      {
        userId: {
          type: String,
          required: true,
        },
        role: {
          type: String,
          enum: ['manager', 'member'],
          default: 'member',
        },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        const anyRet = ret as any;
        anyRet.id = anyRet._id.toString();
        delete anyRet._id;
        delete anyRet.__v;
        return anyRet;
      },
    },
  }
);

export const TeamModel = model<TeamDocument>('Team', TeamSchema);
export default TeamModel;
