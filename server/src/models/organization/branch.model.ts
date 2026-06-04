import { Center } from "./center.model";

export interface Branch {
    name: string;
    displayName?: string | null;
    center: Center;
}