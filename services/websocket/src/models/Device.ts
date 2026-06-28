import mongoose, { Schema, model, Document } from 'mongoose';
import { IDevice } from '@remote-support/shared-types';

export interface DeviceDocument extends Omit<IDevice, 'id'>, Document {}

const DeviceSchema = new Schema<DeviceDocument>(
  {
    deviceId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    deviceName: {
      type: String,
      required: true,
      trim: true,
    },
    hostname: {
      type: String,
      required: true,
      trim: true,
    },
    operatingSystem: {
      type: String,
      required: true,
      trim: true,
    },
    windowsVersion: {
      type: String,
      required: true,
      trim: true,
    },
    cpu: {
      type: String,
      required: true,
    },
    ram: {
      type: Number,
      required: true,
    },
    ipAddress: {
      type: String,
      required: true,
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    screenSharingStatus: {
      type: String,
      default: 'inactive',
    },
    latency: {
      type: Number,
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
    registeredAt: {
      type: Date,
      default: Date.now,
    },
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

const DeviceMongooseModel = model<DeviceDocument>('Device', DeviceSchema);

// In-Memory store for local database-less mode
const inMemoryDevices: any[] = [];

const syncDeviceToApi = (device: any) => {
  const cleanDevice = { ...device };
  delete cleanDevice.save;
  
  fetch('http://localhost:5002/api/devices/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ device: cleanDevice })
  }).catch(err => {
    // Safe catch to ignore logging noise
  });
};

const mockDeviceModel: any = {
  find: (query: any) => {
    if (mongoose.connection.readyState === 1) {
      return DeviceMongooseModel.find(query);
    }
    const mockQuery: any = {
      sort: (sortObj: any) => {
        inMemoryDevices.sort((a, b) => {
          if (a.isOnline && !b.isOnline) return -1;
          if (!a.isOnline && b.isOnline) return 1;
          return 0;
        });
        return mockQuery;
      },
      then: (onfulfilled: any) => {
        return Promise.resolve(inMemoryDevices).then(onfulfilled);
      }
    };
    return mockQuery;
  },
  findOne: async (query: any) => {
    if (mongoose.connection.readyState === 1) {
      return DeviceMongooseModel.findOne(query);
    }
    const q = query || {};
    return inMemoryDevices.find(d => !q.deviceId || d.deviceId === q.deviceId) || null;
  },
  findOneAndUpdate: async (query: any, update: any, options: any) => {
    if (mongoose.connection.readyState === 1) {
      return DeviceMongooseModel.findOneAndUpdate(query, update, options);
    }
    let dev = inMemoryDevices.find(d => d.deviceId === query.deviceId);
    const set = update.$set || update;
    if (!dev) {
      dev = {
        _id: new mongoose.Types.ObjectId(),
        deviceId: query.deviceId,
        ...set,
        createdAt: new Date(),
        updatedAt: new Date(),
        save: async function() {
          syncDeviceToApi(this);
          return this;
        }
      };
      inMemoryDevices.push(dev);
    } else {
      Object.assign(dev, set);
      dev.updatedAt = new Date();
    }
    syncDeviceToApi(dev);
    return dev;
  }
};

export const DeviceModel = mockDeviceModel as any;
export default DeviceModel;
