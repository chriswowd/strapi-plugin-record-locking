import { Server } from "socket.io";
const bootstrap = ({ strapi }) => {
  const io = new Server(strapi.server.httpServer);
  io.on("connection", (socket) => {
    socket.on("openEntity", async ({ entityDocumentId, entityId }) => {
      const userId = strapi.admin.services.token.decodeJwtToken(socket.handshake.auth.token).payload.id;
      const usersPermissionsForThisContent = await strapi.db.connection.select("p.id", "p.action", "p.subject").from("admin_permissions AS p").innerJoin("admin_permissions_role_lnk AS prl", "p.id", "prl.permission_id").innerJoin("admin_users_roles_lnk AS url", "prl.role_id", "url.role_id").where("url.user_id", userId).andWhere("p.subject", entityId);
      const userHasAdequatePermissions = usersPermissionsForThisContent.filter(
        (perm) => ["create", "delete", "publish"].some((operation) => perm.action.includes(operation))
      ).length !== 0;
      if (userHasAdequatePermissions) {
        await strapi.db.query("plugin::record-locking.open-entity").create({
          data: {
            user: String(userId),
            entityId,
            entityDocumentId,
            connectionId: socket.id
          }
        });
      }
    });
    socket.on("closeEntity", async ({ entityId, entityDocumentId, userId }) => {
      await strapi.db.query("plugin::record-locking.open-entity").deleteMany({
        where: {
          user: String(userId),
          entityId,
          entityDocumentId
        }
      });
    });
    socket.on("disconnect", async () => {
      await strapi.db.query("plugin::record-locking.open-entity").deleteMany({
        where: {
          connectionId: socket.id
        }
      });
    });
  });
  strapi.db.query("plugin::record-locking.open-entity").deleteMany();
  strapi.io = io;
};
const destroy = ({ strapi }) => {
  if (strapi?.io?.close) {
    strapi.io.close();
  }
  strapi.db.query("plugin::record-locking.open-entity").deleteMany();
};
const openEntity = {
  kind: "collectionType",
  collectionName: "open-entity",
  info: {
    singularName: "open-entity",
    pluralName: "open-entities",
    displayName: "Open Entity",
    description: "List of open entities for record locking plugin."
  },
  options: {
    draftAndPublish: false
  },
  pluginOptions: {
    "content-manager": {
      visible: true
    },
    "content-type-builder": {
      visible: false
    }
  },
  attributes: {
    entityDocumentId: {
      type: "string",
      configurable: false
    },
    entityId: {
      type: "string",
      configurable: false
    },
    user: {
      type: "string",
      configurable: false
    },
    connectionId: {
      type: "string",
      configurable: false
    }
  }
};
const contentTypes = {
  "open-entity": { schema: openEntity }
};
const DEFAULT_TRANSPORTS = ["polling", "websocket", "webtransport"];
const controller = ({ strapi }) => ({
  async getSettings(ctx) {
    const settings = {
      transports: strapi.plugin("record-locking").config("transports") || DEFAULT_TRANSPORTS
    };
    ctx.send(settings);
  },
  async getStatusBySlug(ctx) {
    const { entityDocumentId } = ctx.request.params;
    const { id: userId } = ctx.state.user;
    const data = await strapi.db.query("plugin::record-locking.open-entity").findOne({
      where: {
        entityDocumentId,
        user: {
          $not: userId
        }
      }
    });
    if (data) {
      const user = await strapi.db.query("admin::user").findOne({ where: { id: data.user } });
      return {
        editedBy: `${user.firstname} ${user.lastname}`
      };
    }
    return false;
  },
  async getStatusByIdAndSlug(ctx) {
    const { entityId, entityDocumentId } = ctx.request.params;
    const { id: userId } = ctx.state.user;
    const data = await strapi.db.query("plugin::record-locking.open-entity").findOne({
      where: {
        entityDocumentId,
        entityId,
        user: {
          $not: userId
        }
      }
    });
    if (data) {
      const user = await strapi.db.query("admin::user").findOne({ where: { id: data.user } });
      return {
        editedBy: `${user.firstname} ${user.lastname}`
      };
    }
    return false;
  },
  async setStatusByIdAndSlug(ctx) {
    const { entityId, entityDocumentId } = ctx.request.params;
    const { id: userId } = ctx.state.user;
    await strapi.db.query("plugin::record-locking.open-entity").create({
      data: {
        user: String(userId),
        entityId,
        entityDocumentId
      }
    });
    return true;
  },
  async deleteStatusByIdAndSlug(ctx) {
    const { entityId, entityDocumentId } = ctx.request.params;
    const { id: userId } = ctx.state.user;
    await strapi.db.query("plugin::record-locking.open-entity").deleteMany({
      where: {
        user: String(userId),
        entityId,
        entityDocumentId
      }
    });
    return "DELETED";
  }
});
const controllers = {
  controller
};
const routes = [
  {
    method: "GET",
    path: "/settings",
    handler: "controller.getSettings",
    config: {
      policies: []
    }
  },
  {
    method: "GET",
    path: "/get-status/:entityDocumentId",
    handler: "controller.getStatusBySlug",
    config: {
      policies: []
    }
  },
  {
    method: "GET",
    path: "/get-status/:entityId/:entityDocumentId",
    handler: "controller.getStatusByIdAndSlug",
    config: {
      policies: []
    }
  },
  {
    method: "POST",
    path: "/set-status/:entityId/:entityDocumentId",
    handler: "controller.setStatusByIdAndSlug",
    config: {
      policies: []
    }
  },
  {
    method: "DELETE",
    path: "/delete-status/:entityId/:entityDocumentId",
    handler: "controller.deleteStatusByIdAndSlug",
    config: {
      policies: []
    }
  }
];
const index = {
  bootstrap,
  destroy,
  controllers,
  routes,
  contentTypes
};
export {
  index as default
};
//# sourceMappingURL=index.mjs.map
