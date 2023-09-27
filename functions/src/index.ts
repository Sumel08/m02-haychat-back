import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";

const app = admin.initializeApp();

export const onNewChatMessage = functions.firestore
  .document("chats/{userId}/{conversationId}/{messageId}")
  .onCreate(async (event, context) => {
    const { source, ...message } = event.data();
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
    const notificationList: Promise<any>[] = [];
    webhooks.docs.forEach((u) => {
      const { service, url } = u.data();
      if (service === "chat") {
        notificationList.push(axios.post(url, notificationData));
      }
    });
    try {
      await Promise.all(notificationList);
    } catch (error) {
      console.log(error);
    }
  });

export const chatWebhook = functions.https.onRequest(async (req, resp) => {
  const { conversationId, userId, message } = req.body;
  try {
    const messageId = uuidv4();
    await app
      .firestore()
      .doc(`chats/${userId}/${conversationId}/${messageId}`)
      .set({
        ...message,
        source:
          message.source && message.source !== app.options.projectId
            ? message.source
            : "webhook",
        id: messageId,
        timestamp: new Date().getTime(),
      });
    resp.status(201).json({ message: messageId });
    return;
  } catch (error) {
    console.log("heelo");
    resp.status(400).json({ message: "something went wrong" });
    return;
  }
});
