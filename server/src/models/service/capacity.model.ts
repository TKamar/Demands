import { Location } from "../location/location.model";

export interface Capacity {
    id: number;
    location: Location;
    resource: string;
    service: string;
    value: number;
    allocated: number;
    available: number;
}