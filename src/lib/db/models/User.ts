import mongoose from "mongoose";
import { UserSchema } from "../schemas/UserSchema";
import type { User } from "$lib/types/User";

export interface IUser extends User, Document {}

const Users = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
export default Users;
