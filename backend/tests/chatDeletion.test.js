const { test } = require("node:test");
const assert = require("node:assert");
const Conversation = require("../models/Conversation");
const ChatMessage = require("../models/ChatMessage");

test("Conversation Schema: includes deletedByUsers field and index", () => {
  const deletedPath = Conversation.schema.path("deletedByUsers");
  assert.ok(deletedPath, "deletedByUsers field must exist on Conversation schema");
  assert.strictEqual(deletedPath.instance, "Array");
  assert.ok(deletedPath._index, "deletedByUsers field should be indexed");
});

test("ChatMessage Schema: includes deletedByUsers field and index", () => {
  const deletedPath = ChatMessage.schema.path("deletedByUsers");
  assert.ok(deletedPath, "deletedByUsers field must exist on ChatMessage schema");
  assert.strictEqual(deletedPath.instance, "Array");
  assert.ok(deletedPath._index, "deletedByUsers field should be indexed");
});

test("Chat Controller: exports deletion functions", () => {
  const {
    deleteConversation,
    deleteMultipleConversations,
    clearAllConversations,
  } = require("../controllers/chatController");

  assert.strictEqual(typeof deleteConversation, "function", "deleteConversation must be exported");
  assert.strictEqual(typeof deleteMultipleConversations, "function", "deleteMultipleConversations must be exported");
  assert.strictEqual(typeof clearAllConversations, "function", "clearAllConversations must be exported");
});
