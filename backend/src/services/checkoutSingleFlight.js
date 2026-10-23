// Coalesce overlapping requests only; this is not a durable payment lock.
function createCheckoutSingleFlight() {
  const pending = new Map();
  return (userId, selection, create) => {
    const current = pending.get(userId);
    if (current) {
      if (current.selection !== selection) return Promise.reject(Object.assign(new Error('Another checkout is being prepared. Please wait.'), { status: 409 }));
      return current.promise;
    }
    const promise = Promise.resolve().then(create).finally(() => pending.delete(userId));
    pending.set(userId, { selection, promise });
    return promise;
  };
}
module.exports = { createCheckoutSingleFlight };
