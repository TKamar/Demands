import { Router } from "express";

// Auth routes
import authRoutes from "./auth/auth.routes";
import usersGroupsRoutes from "./usersGroups/usersGroups.routes";

// Organization routes
import centerRoutes from "./organization/center.routes";
import branchRoutes from "./organization/branch.routes";
import sectionRoutes from "./organization/section.routes";

// Location routes
import baseRoutes from "./location/base.routes";
import environmentRoutes from "./location/environment.routes";
import networkRoutes from "./location/network.routes";
import clusterRoutes from "./location/cluster.routes";
import locationRoutes from "./location/location.routes";

// Service routes
import serviceRoutes from "./service/service.routes";
import resourceRoutes from "./service/resource.routes";
import capacityRoutes from "./service/capacity.routes";

// Wallet routes
import walletRoutes from "./wallet/wallet.routes";

// Request routes
import projectRoutes from "./request/project.routes";
import demandRoutes from "./request/demand.routes";
import projectKindRoutes from "./request/projectKind.routes";
import emergencyOptionRoutes from "./request/emergencyOption.routes";

// Notification routes
import notificationRoutes from "./notification/notification.routes";

const router = Router();

// Auth endpoints
router.use("/auth", authRoutes);
router.use("/users-groups", usersGroupsRoutes);

// Organization endpoints
router.use("/centers", centerRoutes);
router.use("/branches", branchRoutes);
router.use("/sections", sectionRoutes);

// Location endpoints
router.use("/bases", baseRoutes);
router.use("/environments", environmentRoutes);
router.use("/networks", networkRoutes);
router.use("/clusters", clusterRoutes);
router.use("/locations", locationRoutes);

// Service endpoints
router.use("/services", serviceRoutes);
router.use("/resources", resourceRoutes);
router.use("/capacities", capacityRoutes);

// Wallet endpoints
router.use("/wallets", walletRoutes);

// Request endpoints
router.use("/projects", projectRoutes);
router.use("/demands", demandRoutes);
router.use("/project-kinds", projectKindRoutes);
router.use("/emergency-options", emergencyOptionRoutes);

// Notification endpoints
router.use("/notifications", notificationRoutes);

export default router;
