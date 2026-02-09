import { prisma } from "../../../db";
import type {
  DefaultViewScope,
  ResolvedDefault,
  IsDefaultResult,
} from "./types";

interface GetResolvedDefaultParams {
  projectId: string;
  viewName: string;
  userId?: string;
}

interface SetAsDefaultParams {
  projectId: string;
  viewId: string;
  viewName: string;
  scope: DefaultViewScope;
  userId?: string;
}

interface ClearDefaultParams {
  projectId: string;
  viewName: string;
  scope: DefaultViewScope;
  userId?: string;
}

export class DefaultViewService {
  /**
   * Get the resolved default view for a given context.
   * Priority: user default > project default > null
   */
  public static async getResolvedDefault({
    projectId,
    viewName,
    userId,
  }: GetResolvedDefaultParams): Promise<ResolvedDefault | null> {
    // Get all defaults for this project/viewName (both user and project level)
    const defaults = await prisma.defaultView.findMany({
      where: {
        projectId,
        viewName,
        OR: [{ userId: userId ?? null }, { userId: null }],
      },
    });

    // Check for user-level default first (if userId provided)
    if (userId) {
      const userDefault = defaults.find((d) => d.userId === userId);
      if (userDefault) {
        return { viewId: userDefault.viewId, scope: "user" };
      }
    }

    // Fall back to project-level default
    const projectDefault = defaults.find((d) => d.userId === null);
    if (projectDefault) {
      return { viewId: projectDefault.viewId, scope: "project" };
    }

    return null;
  }

  /**
   * Set a view as the default for user or project level.
   * Upserts the default view record.
   */
  public static async setAsDefault({
    projectId,
    viewId,
    viewName,
    scope,
    userId,
  }: SetAsDefaultParams): Promise<void> {
    const userIdToUse = scope === "user" ? userId : null;

    if (scope === "user" && !userId) {
      throw new Error("userId is required for user-level defaults");
    }

    // Manual upsert to handle nullable userId in composite unique
    const existing = await prisma.defaultView.findFirst({
      where: {
        projectId,
        viewName,
        userId: userIdToUse,
      },
    });

    if (existing) {
      await prisma.defaultView.update({
        where: { id: existing.id },
        data: { viewId },
      });
    } else {
      await prisma.defaultView.create({
        data: {
          projectId,
          userId: userIdToUse,
          viewName,
          viewId,
        },
      });
    }
  }

  public static async clearDefault({
    projectId,
    viewName,
    scope,
    userId,
  }: ClearDefaultParams): Promise<void> {
    const userIdToUse = scope === "user" ? userId : null;

    if (scope === "user" && !userId) {
      throw new Error("userId is required for clearing user-level defaults");
    }

    await prisma.defaultView.deleteMany({
      where: {
        projectId,
        viewName,
        userId: userIdToUse,
      },
    });
  }

  /**
   * Check if a view is set as default (user or project level).
   * Returns info about which defaults reference this view.
   */
  public static async isViewDefault(viewId: string): Promise<IsDefaultResult> {
    const defaults = await prisma.defaultView.findMany({
      where: { viewId },
    });

    return {
      isUserDefault: defaults.some((d) => d.userId !== null),
      isProjectDefault: defaults.some((d) => d.userId === null),
      affectedCount: defaults.length,
    };
  }

  /**
   * Clean up all default view references for a deleted view.
   * Call this before deleting a TableViewPreset.
   */
  public static async cleanupOrphanedDefaults(viewId: string): Promise<void> {
    await prisma.defaultView.deleteMany({
      where: { viewId },
    });
  }
}
