import { Resource } from "../service/resource.model";
import { Service } from "../service/service.model";
import { Project } from "./project.model";
import { Location } from "../location/location.model";

export enum DemandType {
    New,
    Extension,
};

export enum DemandStatus {
    Pending,
    Approved,
    Rejected,
    PartiallyApproved,
};

export interface Demand {
    id: number;
    project: Project;
    service: Service;
    resource: Resource;
    value: number;
    location: Location;
    type: DemandType;
    clusterName?: string;
    approvedValue?: number;
    approvedDate?: Date;
    status: DemandStatus;
}