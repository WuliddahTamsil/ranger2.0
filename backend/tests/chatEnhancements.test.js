const { test } = require("node:test");
const assert = require("node:assert");
const ChatMessage = require("../models/ChatMessage");
const Conversation = require("../models/Conversation");
const { resolveParticipant, orderLookupCache } = require("../utils/chatAccess");

test("ChatMessage Schema: includes senderPhoto and senderName fields", () => {
  const photoPath = ChatMessage.schema.path("senderPhoto");
  const namePath = ChatMessage.schema.path("senderName");
  assert.ok(photoPath, "senderPhoto field must exist in ChatMessage schema");
  assert.ok(namePath, "senderName field must exist in ChatMessage schema");
  assert.strictEqual(photoPath.instance, "String");
  assert.strictEqual(namePath.instance, "String");
});

test("ChatMessage Schema: attachment subdocument is properly structured", () => {
  const attachmentPath = ChatMessage.schema.path("attachment");
  assert.ok(attachmentPath, "attachment field must exist in ChatMessage schema");
  
  const typeField = ChatMessage.schema.path("attachment.type");
  const urlField = ChatMessage.schema.path("attachment.url");
  assert.ok(typeField, "attachment.type must exist");
  assert.ok(urlField, "attachment.url must exist");
});

test("ChatMessage Schema: compound indexes are registered for high-speed queries", () => {
  const indexes = ChatMessage.schema.indexes();
  assert.ok(Array.isArray(indexes), "Indexes must be defined on schema");
  
  // Verify orderId + createdAt index exists
  const hasOrderCreatedIndex = indexes.some(idx => idx[0] && idx[0].orderId === 1 && idx[0].createdAt === 1);
  assert.ok(hasOrderCreatedIndex, "Compound index on orderId + createdAt must exist");

  // Verify conversationId + createdAt index exists
  const hasConvCreatedIndex = indexes.some(idx => idx[0] && idx[0].conversationId === 1 && idx[0].createdAt === 1);
  assert.ok(hasConvCreatedIndex, "Compound index on conversationId + createdAt must exist");

  // Verify orderId + channel + createdAt index exists
  const hasOrderChannelIndex = indexes.some(idx => idx[0] && idx[0].orderId === 1 && idx[0].channel === 1);
  assert.ok(hasOrderChannelIndex, "Compound index on orderId + channel must exist");
});

test("Conversation Schema: includes participant photo fields and sorting indexes", () => {
  const custPhoto = Conversation.schema.path("customerPhoto");
  const driverPhoto = Conversation.schema.path("driverPhoto");
  const ownerPhoto = Conversation.schema.path("ownerPhoto");
  const lastMsgText = Conversation.schema.path("lastMessageText");

  assert.ok(custPhoto, "customerPhoto field must exist");
  assert.ok(driverPhoto, "driverPhoto field must exist");
  assert.ok(ownerPhoto, "ownerPhoto field must exist");
  assert.ok(lastMsgText, "lastMessageText field must exist");

  const indexes = Conversation.schema.indexes();
  assert.ok(Array.isArray(indexes), "Conversation indexes must be defined");
  
  const hasCustomerIndex = indexes.some(idx => idx[0] && idx[0].customerId === 1);
  const hasOwnerIndex = indexes.some(idx => idx[0] && idx[0].ownerId === 1);
  const hasDriverIndex = indexes.some(idx => idx[0] && idx[0].driverId === 1);
  assert.ok(hasCustomerIndex, "Index on customerId must exist");
  assert.ok(hasOwnerIndex, "Index on ownerId must exist");
  assert.ok(hasDriverIndex, "Index on driverId must exist");
});

test("chatAccess: resolveParticipant uses pre-authenticated authUser without extra DB query", async () => {
  const mockAuthUser = {
    _id: "660000000000000000000001",
    role: "customer",
    name: "John Doe",
    email: "john@example.com",
    profilePhoto: "https://res.cloudinary.com/demo/photo.jpg",
  };

  const mockRecord = {
    orderType: "ride",
    order: {
      _id: "660000000000000000000099",
      customerId: "660000000000000000000001",
      driverId: "660000000000000000000002",
    },
  };

  const participant = await resolveParticipant(mockAuthUser, mockRecord);
  assert.ok(participant, "Participant should resolve");
  assert.strictEqual(participant.role, "customer");
  assert.strictEqual(participant.user.name, "John Doe");
  assert.strictEqual(participant.user.profilePhoto, "https://res.cloudinary.com/demo/photo.jpg");
});

test("chatAccess: orderLookupCache in-memory cache caches and clears entries properly", () => {
  assert.ok(orderLookupCache, "orderLookupCache must exist");
  orderLookupCache.set("test_key", { order: { id: "123" } });
  
  assert.ok(orderLookupCache.has("test_key"), "Key should exist in cache");
  assert.strictEqual(orderLookupCache.get("test_key").order.id, "123");
  
  orderLookupCache.delete("test_key");
  assert.strictEqual(orderLookupCache.has("test_key"), false);
});
