"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatWebhook = exports.onNewChatMessage = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios_1 = require("axios");
const uuid_1 = require("uuid");
const app = admin.initializeApp();
exports.onNewChatMessage = functions.firestore
    .document("chats/{userId}/{conversationId}/{messageId}")
    .onCreate(async (event, context) => {
    const _a = event.data(), { source } = _a, message = __rest(_a, ["source"]);
    if (source !== app.options.projectId) {
        return;
    }
    const { conversationId, userId } = context.params;
    const notificationData = {
        id: event.id,
        conversationId,
        userId,
        message,
        timestamp: context.timestamp,
    };
    const webhooks = await app.firestore().collection("webhooks").get();
    const notificationList = [];
    webhooks.docs.forEach((u) => {
        const { service, url } = u.data();
        if (service === "chat") {
            notificationList.push(axios_1.default.post(url, notificationData));
        }
    });
    try {
        await Promise.all(notificationList);
    }
    catch (error) {
        console.log(error);
    }
});
exports.chatWebhook = functions.https.onRequest(async (req, resp) => {
    const { conversationId, userId, message } = req.body;
    console.log(JSON.stringify(message));
    try {
        const messageId = (0, uuid_1.v4)();
        await app
            .firestore()
            .doc(`chats/${userId}/${conversationId}/${messageId}`)
            .set(Object.assign(Object.assign({}, message), { source: message.source && message.source !== app.options.projectId
                ? message.source
                : "webhook", id: messageId, timestamp: new Date().getTime() }));
        resp.status(201).json({ message: messageId });
        return;
    }
    catch (error) {
        console.log(error);
        resp.status(400).json({ message: "something went wrong" });
        return;
    }
});
//# sourceMappingURL=index.js.map