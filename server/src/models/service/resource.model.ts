import { Service } from "./service.model";

export interface Resource {
    name: string;
    unit: string;
    service: Service;
}