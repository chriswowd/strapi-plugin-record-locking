"use strict";
const jsxRuntime = require("react/jsx-runtime");
const designSystem = require("@strapi/design-system");
const react = require("react");
const reactIntl = require("react-intl");
const socket_ioClient = require("socket.io-client");
const reactRouterDom = require("react-router-dom");
const admin = require("@strapi/strapi/admin");
const __variableDynamicImportRuntimeHelper = (glob, path) => {
  const v = glob[path];
  if (v) {
    return typeof v === "function" ? v() : Promise.resolve(v);
  }
  return new Promise((_, reject) => {
    (typeof queueMicrotask === "function" ? queueMicrotask : setTimeout)(reject.bind(null, new Error("Unknown variable dynamic import: " + path)));
  });
};
const name = "record-locking";
const version = "2.0.0";
const description = "Custom built asset locking for stc (modified the plugin @notum-cz/strapi-plugin-record-locking).";
const keywords = [];
const license = "MIT";
const type = "commonjs";
const author = "Chris.Aziel";
const maintainers = [
  "Chris.Aziel"
];
const exports$1 = {
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
  "@strapi/strapi": "^5.0.6",
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
  description: "Custom built asset locking for stc (modified the plugin @notum-cz/strapi-plugin-record-locking).",
  required: false,
  kind: "plugin"
};
const pluginPkg = {
  name,
  version,
  description,
  keywords,
  license,
  type,
  author,
  maintainers,
  exports: exports$1,
  files,
  scripts,
  dependencies,
  devDependencies,
  peerDependencies,
  engines,
  strapi
};
const PLUGIN_ID = pluginPkg.name;
const getTranslation = (id) => `${PLUGIN_ID}.${id}`;
const useLockingData = () => {
  const collectionType = reactRouterDom.useMatch("/content-manager/collection-types/:entityId/:entityDocumentId");
  const singleType = reactRouterDom.useMatch("/content-manager/single-types/:entityId");
  const user = admin.useAuth("ENTITY_LOCK", (state) => state.user);
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
  const { get } = admin.useFetchClient();
  const lockingData = useLockingData();
  const socket = react.useRef(null);
  const [isLocked, setIsLocked] = react.useState(false);
  const [username, setUsername] = react.useState("");
  const [settings, setSettings] = react.useState(null);
  react.useEffect(() => {
    get("/record-locking/settings").then((response) => {
      setSettings(response.data);
    });
  }, []);
  react.useEffect(() => {
    const token = localStorage.getItem("jwtToken") || sessionStorage.getItem("jwtToken");
    if (token && lockingData?.requestData.entityDocumentId !== "create" && settings) {
      socket.current = socket_ioClient.io(void 0, {
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
  const navigate = reactRouterDom.useNavigate();
  const { formatMessage } = reactIntl.useIntl();
  const lockStatus = useLockStatus();
  if (!lockStatus)
    return null;
  return lockStatus.isLocked && /* @__PURE__ */ jsxRuntime.jsx(designSystem.Modal.Root, { open: true, onOpenChange: () => {
  }, modal: true, children: /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Modal.Content, { children: [
    /* @__PURE__ */ jsxRuntime.jsx(designSystem.Modal.Body, { children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { children: formatMessage(
      {
        id: getTranslation("ModalWindow.CurrentlyEditingBody"),
        defaultMessage: "This entry is currently edited by {username}"
      },
      {
        username: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { fontWeight: "bold", children: lockStatus.username })
      }
    ) }) }),
    /* @__PURE__ */ jsxRuntime.jsx(designSystem.Modal.Footer, { children: /* @__PURE__ */ jsxRuntime.jsx(
      designSystem.Button,
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
  const ref = react.useRef(setPlugin);
  react.useEffect(() => {
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
        return __variableDynamicImportRuntimeHelper(/* @__PURE__ */ Object.assign({ "./translations/cs.json": () => Promise.resolve().then(() => require("../_chunks/cs-Bcw5VWtm.js")), "./translations/en.json": () => Promise.resolve().then(() => require("../_chunks/en-vXjaFaFx.js")) }), `./translations/${locale}.json`).then(({ default: data }) => {
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
  return Object.keys(trad).reduce((acc, current) => {
    acc[`${pluginId}.${current}`] = trad[current];
    return acc;
  }, {});
};
module.exports = index;
//# sourceMappingURL=index.js.map
