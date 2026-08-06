---
name: i18n-change
description: Add or change user-visible copy while preserving Spanish/English parity and localized backend errors.
---
# Internationalization change

Use namespaced keys; do not hardcode visible copy. Update ES and EN together, preserve canonical values separate from labels, pass locale/Accept-Language across boundaries, test long English text and accented Spanish, then run `npm --prefix frontend run i18n:check`.
