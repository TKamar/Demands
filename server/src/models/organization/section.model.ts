import { Branch } from "./branch.model";

export interface Section {
    name: string;
    displayName?: string | null;
    branch: Branch;
}