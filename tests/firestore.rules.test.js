import { readFileSync } from 'node:fs'
import { before, beforeEach, after, test } from 'node:test'
import assert from 'node:assert/strict'
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  writeBatch,
} from 'firebase/firestore'

const PROJECT_ID = 'demo-anon-community'
let testEnv

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  })
})

beforeEach(async () => {
  await testEnv.clearFirestore()
})

after(async () => {
  await testEnv.cleanup()
})

function anonymousDb(uid = 'anon-user') {
  return testEnv.authenticatedContext(uid, {
    firebase: { sign_in_provider: 'anonymous' },
  }).firestore()
}

function passwordDb(uid = 'password-user') {
  return testEnv.authenticatedContext(uid, {
    firebase: { sign_in_provider: 'password' },
  }).firestore()
}

function messageData(body = 'Hello crypto community') {
  return {
    character: 'شبح ساتوشي',
    avatar: '👻',
    body,
    createdAt: serverTimestamp(),
  }
}

async function publish(db, messageId, body) {
  const batch = writeBatch(db)
  batch.set(doc(db, 'communityMessages', messageId), messageData(body))
  batch.set(doc(db, 'communityMessageOwners', messageId), {
    ownerUid: 'anon-user',
    createdAt: serverTimestamp(),
  })
  await batch.commit()
}

test('anonymous members can publish text with private ownership metadata', async () => {
  const db = anonymousDb()
  await assertSucceeds(publish(db, 'message-1'))
  const publicMessage = await assertSucceeds(getDoc(doc(db, 'communityMessages', 'message-1')))
  assert.equal(publicMessage.data().body, 'Hello crypto community')
  assert.equal('authorUid' in publicMessage.data(), false)
  await assertFails(getDoc(doc(db, 'communityMessageOwners', 'message-1')))
})

test('the public can read the text feed without authentication', async () => {
  await assertSucceeds(getDocs(collection(testEnv.unauthenticatedContext().firestore(), 'communityMessages')))
})

test('password-authenticated users cannot publish to the anonymous community', async () => {
  const db = passwordDb()
  const batch = writeBatch(db)
  batch.set(doc(db, 'communityMessages', 'message-1'), messageData())
  batch.set(doc(db, 'communityMessageOwners', 'message-1'), {
    ownerUid: 'password-user',
    createdAt: serverTimestamp(),
  })
  await assertFails(batch.commit())
})

test('a message cannot be created without matching private ownership metadata', async () => {
  const db = anonymousDb()
  await assertFails(setDoc(doc(db, 'communityMessages', 'orphan'), messageData()))
})

test('common personal data and links are rejected by Firestore rules', async (t) => {
  const db = anonymousDb()
  const samples = [
    'contact me at person@example.com',
    'call me at +1 202 555 0123',
    'visit https://example.com',
    'wallet 0x' + 'a'.repeat(40),
    'private key ' + 'a'.repeat(64),
    'my password is secret',
  ]
  for (const [index, sample] of samples.entries()) {
    await t.test('rejects sample ' + (index + 1), async () => {
      const batch = writeBatch(db)
      batch.set(doc(db, 'communityMessages', 'bad-' + index), messageData(sample))
      batch.set(doc(db, 'communityMessageOwners', 'bad-' + index), {
        ownerUid: 'anon-user',
        createdAt: serverTimestamp(),
      })
      await assertFails(batch.commit())
    })
  }
})

test('only the author can delete a message and its owner record', async () => {
  const owner = anonymousDb('anon-user')
  await assertSucceeds(publish(owner, 'mine'))
  const deletion = writeBatch(owner)
  deletion.delete(doc(owner, 'communityMessages', 'mine'))
  deletion.delete(doc(owner, 'communityMessageOwners', 'mine'))
  await assertSucceeds(deletion.commit())
  await assertFails(getDoc(doc(owner, 'communityMessages', 'mine')))

  const another = anonymousDb('another-user')
  await assertSucceeds(publish(owner, 'theirs'))
  const attempt = writeBatch(another)
  attempt.delete(doc(another, 'communityMessages', 'theirs'))
  attempt.delete(doc(another, 'communityMessageOwners', 'theirs'))
  await assertFails(attempt.commit())
})

test('members can create a fixed-reason report but cannot read reports', async () => {
  const db = anonymousDb()
  await assertSucceeds(publish(db, 'reported-message'))
  const reportId = 'reported-message_anon-user'
  await assertSucceeds(setDoc(doc(db, 'communityReports', reportId), {
    messageId: 'reported-message',
    reporterUid: 'anon-user',
    reason: 'personal_data_or_abuse',
    createdAt: serverTimestamp(),
  }))
  await assertFails(getDoc(doc(db, 'communityReports', reportId)))
  await assertFails(getDocs(collection(db, 'communityReports')))
})

test('reports cannot be forged for a different user or missing message', async () => {
  const db = anonymousDb()
  await assertFails(setDoc(doc(db, 'communityReports', 'ghost_anon-user'), {
    messageId: 'ghost',
    reporterUid: 'anon-user',
    reason: 'personal_data_or_abuse',
    createdAt: serverTimestamp(),
  }))
  await assertFails(setDoc(doc(db, 'communityReports', 'ghost_someone-else'), {
    messageId: 'ghost',
    reporterUid: 'someone-else',
    reason: 'personal_data_or_abuse',
    createdAt: serverTimestamp(),
  }))
})
