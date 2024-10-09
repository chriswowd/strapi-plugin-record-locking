import { jsx, jsxs } from "react/jsx-runtime";
import { Modal, Typography, Button } from "@strapi/design-system";
import { useRef, useState, useEffect } from "react";
import { useIntl } from "react-intl";
import { io } from "socket.io-client";
import { useNavigate, useMatch } from "react-router-dom";
import { useFetchClient, useAuth } from "@strapi/strapi/admin";
const __variableDynamicImportRuntimeHelper = (glob, path) => {
  const v = glob[path];
  if (v) {
    return typeof v === "function" ? v() : Promise.resolve(v);
  }
  return new Promise((_, reject) => {
    (typeof queueMicrotask === "function" ? queueMicrotask : setTimeout)(reject.bind(null, new Error("Unknown variable dynamic import: " + path)));
  });
};
const name = "@notum-cz/strapi-plugin-record-locking";
const version = "2.0.0";
const description = "Hey I am editing, don't change my content";
const keywords = [];
const homepage = "https://github.com/notum-cz/strapi-plugin-record-locking#readme";
const type = "commonjs";
const bugs = {
  url: "https://github.com/notum-cz/strapi-plugin-record-locking/issues"
};
const repository = {
  type: "git",
  url: "git+https://github.com/notum-cz/strapi-plugin-record-locking.git"
};
const license = "MIT";
const author = "Notum Technologies s.r.o. <sales@notum.cz> (https://notum.cz/en/strapi)";
const maintainers = [
  "Notum Technologies s.r.o. <sales@notum.cz> (https://notum.cz/en/strapi)",
  "Martin Čapek <martin.capek@notum.cz> (https://notum.cz/en/strapi)",
  "Dominik Juriga <dominik.juriga@notum.cz> (https://notum.cz/en/strapi)"
];
const exports = {
  "./package.json": "./package.json",
  "./strapi-admin": {
    types: "./dist/admin/src/index.d.ts",
    source: "./admin/src/index.ts",
    "import": "./dist/admin/index.mjs",
    require: "./dist/admin/index.js",
    "default": "./dist/admin/index.js"
  },
  "./strapi-server": {
    types: "./dist/server/src/index.d.ts",
    source: "./server/src/index.ts",
    "import": "./dist/server/index.mjs",
    require: "./dist/server/index.js",
    "default": "./dist/server/index.js"
  }
};
const files = [
  "dist"
];
const scripts = {
  build: "strapi-plugin build",
  "test:ts:back": "run -T tsc -p server/tsconfig.json",
  "test:ts:front": "run -T tsc -p admin/tsconfig.json",
  verify: "strapi-plugin verify",
  watch: "strapi-plugin watch",
  "watch:link": "strapi-plugin watch:link"
};
const dependencies = {
  "@strapi/design-system": "^2.0.0-rc.11",
  "@strapi/icons": "^2.0.0-rc.11",
  "react-intl": "^6.7.0",
  "socket.io": "^4.8.0",
  "socket.io-client": "^4.8.0"
};
const devDependencies = {
  "@strapi/sdk-plugin": "^5.2.6",
  "@strapi/strapi": "^5.0.0",
  "@strapi/typescript-utils": "^5.0.0",
  "@types/react": "^18.3.8",
  "@types/react-dom": "^18.3.0",
  prettier: "^3.3.3",
  react: "^18.3.1",
  "react-dom": "^18.3.1",
  "react-router-dom": "^6.26.2",
  "styled-components": "^6.1.13",
  typescript: "^5.6.2"
};
const peerDependencies = {
  "@strapi/sdk-plugin": "^5.2.6",
  "@strapi/strapi": "^5.0.0",
  react: "^18.3.1",
  "react-dom": "^18.3.1",
  "react-router-dom": "^6.26.2",
  "styled-components": "^6.1.13"
};
const engines = {
  node: ">=14.19.1 <=20.x.x",
  npm: ">=6.0.0"
};
const strapi = {
  displayName: "Record locking",
  name: "record-locking",
  description: "Hey I am editing, don't change my content",
  required: false,
  kind: "plugin"
};
const pluginPkg = {
  name,
  version,
  description,
  keywords,
  homepage,
  type,
  bugs,
  repository,
  license,
  author,
  maintainers,
  exports,
  files,
  scripts,
  dependencies,
  devDependencies,
  peerDependencies,
  engines,
  strapi
};
const PLUGIN_ID = pluginPkg.name.replace(/^@notum-cz\/strapi-plugin-/i, "");
const getTranslation = (id) => `${PLUGIN_ID}.${id}`;
const useLockingData = () => {
  const collectionType = useMatch("/content-manager/collection-types/:entityId/:entityDocumentId");
  const singleType = useMatch("/content-manager/single-types/:entityId");
  const user = useAuth("ENTITY_LOCK", (state) => state.user);
  if (!user)
    return null;
  if (collectionType) {
    return {
      requestData: {
        entityId: collectionType.params.entityId,
        entityDocumentId: collectionType.params.entityDocumentId,
        userId: user.id
      },
      requestUrl: `/record-locking/get-status/${collectionType.params.entityId}/${collectionType.params.entityDocumentId}`
    };
  } else if (singleType) {
    return {
      requestData: {
        entityId: singleType.params.entityId,
        userId: user.id
      },
      requestUrl: `/record-locking/get-status/${singleType.params.entityId}`
    };
  }
  return null;
};
const useLockStatus = () => {
  const { get } = useFetchClient();
  const lockingData = useLockingData();
  const socket = useRef(null);
  const [isLocked, setIsLocked] = useState(false);
  const [username, setUsername] = useState("");
  const [settings, setSettings] = useState(null);
  useEffect(() => {
    get("/record-locking/settings").then((response) => {
      setSettings(response.data);
    });
  }, []);
  useEffect(() => {
    const token = localStorage.getItem("jwtToken") || sessionStorage.getItem("jwtToken");
    if (token && lockingData?.requestData.entityDocumentId !== "create" && settings) {
      socket.current = io(void 0, {
        reconnectionDelayMax: 1e4,
        rejectUnauthorized: false,
        auth: (cb) => {
          cb({
            token: JSON.parse(token)
          });
        },
        transports: settings.transports
      });
      socket.current.io.on("reconnect", attemptEntityLocking);
      attemptEntityLocking();
    }
    return () => {
      if (lockingData?.requestData.entityDocumentId !== "create" && settings) {
        socket.current?.emit("closeEntity", lockingData?.requestData);
        socket.current?.close();
      }
    };
  }, [settings]);
  if (!lockingData?.requestUrl)
    return null;
  const attemptEntityLocking = async () => {
    try {
      const lockingResponse = await get(lockingData.requestUrl);
      if (!lockingResponse.data) {
        socket.current?.emit("openEntity", lockingData?.requestData);
      } else {
        setIsLocked(true);
        setUsername(lockingResponse.data.editedBy);
      }
    } catch (error) {
      console.warn(error);
    }
  };
  return {
    isLocked,
    username,
    attemptEntityLocking
  };
};
function EntityLock() {
  const navigate = useNavigate();
  const { formatMessage } = useIntl();
  const lockStatus = useLockStatus();
  if (!lockStatus)
    return null;
  return lockStatus.isLocked && /* @__PURE__ */ jsx(Modal.Root, { open: true, onOpenChange: () => {
  }, modal: true, children: /* @__PURE__ */ jsxs(Modal.Content, { children: [
    /* @__PURE__ */ jsx("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" }, children: /* @__PURE__ */ jsx(Typography, { fontWeight: "bold", textColor: "neutral800", as: "h2", id: "title", children: formatMessage({
      id: getTranslation("ModalWindow.CurrentlyEditing"),
      defaultMessage: "This entry is currently edited"
    }) }) }),
    /* @__PURE__ */ jsx(Modal.Body, { children: /* @__PURE__ */ jsx(Typography, { children: formatMessage(
      {
        id: getTranslation("ModalWindow.CurrentlyEditingBody"),
        defaultMessage: "This entry is currently edited by {username}"
      },
      {
        username: /* @__PURE__ */ jsx(Typography, { fontWeight: "bold", children: lockStatus.username })
      }
    ) }) }),
    /* @__PURE__ */ jsx(Modal.Footer, { children: /* @__PURE__ */ jsx(
      Button,
      {
        onClick: () => {
          navigate(-1);
        },
        children: formatMessage({
          id: getTranslation("ModalWindow.CurrentlyEditing.Button"),
          defaultMessage: "Go Back"
        })
      }
    ) })
  ] }) });
}
const Initializer = ({ setPlugin }) => {
  const ref = useRef(setPlugin);
  useEffect(() => {
    ref.current(PLUGIN_ID);
  }, []);
  return null;
};
const index = {
  register(app) {
    app.registerPlugin({
      id: PLUGIN_ID,
      initializer: Initializer,
      isReady: false,
      name: PLUGIN_ID
    });
  },
  bootstrap(app) {
    app.getPlugin("content-manager").injectComponent("editView", "right-links", {
      name: "EntityLock",
      Component: EntityLock
    });
  },
  async registerTrads(app) {
    const { locales } = app;
    const importedTranslations = await Promise.all(
      locales.map((locale) => {
        return __variableDynamicImportRuntimeHelper(/* @__PURE__ */ Object.assign({ "./translations/cs.json": () => import("../_chunks/cs-aKF4ziUG.mjs"), "./translations/en.json": () => import("../_chunks/en-BaAta1oA.mjs") }), `./translations/${locale}.json`).then(({ default: data }) => {
          return {
            data: prefixPluginTranslations(data, PLUGIN_ID),
            locale
          };
        }).catch(() => {
          return {
            data: {},
            locale
          };
        });
      })
    );
    return importedTranslations;
  }
};
const prefixPluginTranslations = (trad, pluginId) => {
  if (!pluginId) {
    throw new TypeError("pluginId can't be empty");
  }
  return Object.keys(trad).reduce((acc, current) => {
    acc[`${pluginId}.${current}`] = trad[current];
    return acc;
  }, {});
};
export {
  index as default
};
//# sourceMappingURL=index.mjs.map
