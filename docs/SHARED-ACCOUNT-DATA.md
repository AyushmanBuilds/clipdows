# Shared account data contract

The Windows dashboard is the account owner and publishes shared settings to Firestore. Paired devices read these documents from users/{uid}/meta. Keep ClipDows Guide completion local to each app/device because its tours describe different controls.

## Profile picture

Document: users/{uid}/meta/profile

    {
      "photoDataUrl": "data:image/webp;base64,...",
      "updatedAt": 1791390000000
    }

The Windows cropper stores a 256 × 256 WebP data URL (JPEG fallback) so the avatar stays small enough for a Firestore document. An empty photoDataUrl is the removal format. PWA updates should keep the same fields and always advance updatedAt.

## AI Focus settings

Document: users/{uid}/meta/focusSettings

    {
      "focusCapture": true,
      "focusTopics": ["work", "learning"],
      "focusCustomTopics": [
        { "id": "custom-example", "label": "My topic", "prompt": "A short description" }
      ],
      "updatedAt": 1791390000000
    }

The settings are cached per account on Windows. Apply the current account's plan limits when activating topics; the stored selections can remain available if the account later changes tiers.

## Focus Review entries

Each entry has a separate document in the same meta collection. The ID is focusReview_ followed by the base64url encoding of reviewId.

An active item stores row metadata and an AES-GCM encrypted JSON row in payload. It uses the same unlocked account key and wire format as encrypted clipboard sync.

    {
      "kind": "focusReview",
      "reviewId": "local-item-id",
      "updated_at": 1791390000000,
      "expires_at": 1791562800000,
      "payload": "base64(iv || ciphertext)"
    }

Removal and expiry use a tombstone so a device that was offline can learn the item was removed:

    {
      "kind": "focusReview",
      "reviewId": "local-item-id",
      "deleted_at": 1791390000000,
      "updated_at": 1791390000000
    }

Items expire after 48 hours. Keep tombstones for up to 30 days, then clean them up. The PWA should decrypt active payloads with the same account passphrase, apply newer updated_at/deleted_at values, and coordinate the shared reminded_at timestamp so Windows and PWA do not send duplicate reminders.

## Access

The PWA Firestore rules allow the account owner to write all meta documents and a currently linked phone to read shared metadata. Linked phones can write only validated profile and Focus settings documents plus encrypted Focus Review records. They cannot write meta/plan or meta/crypto. Deploy the PWA rules from its project before paired-phone writes are enabled.
