# Word Test Playground

This is a static website for elementary school English word tests. It works with GitHub Pages because it uses only plain HTML, CSS, and JavaScript.

## Features

- Create multiple named word pools such as `Test 1` and `Test 2`
- Upload a separate CSV file for each pool
- Enter a username and automatically create test IDs like `username-1`, `username-2`, `username-3`
- Pronounce each word using the browser speech engine
- Show the word and fetch a simple English meaning
- Record answers as `I know it`, `Not sure`, and `I don't know`
- Restart a full pool or retest only missed and unsure words from an earlier test
- Use keyboard shortcuts for faster testing, including iPad with a hardware keyboard
- Review previous test records in the browser

## Important note

Because this is a static site, the uploaded vocabulary, test counters, and history are stored in the browser with `localStorage`.

- Data is saved only on the browser/device being used
- If the browser storage is cleared, the records are removed
- If you want shared records across different devices, you will need a backend later

## CSV format

Use a CSV file with one word per line, for example:

```csv
apple
banana
teacher
computer
```

You can also include a first-row header:

```csv
word
apple
banana
teacher
```

## Keyboard shortcuts

- `P` pronounce the current word
- `W` show the current word
- `M` show the meaning
- `1` answer `I know it`
- `2` answer `Not sure`
- `3` answer `I don't know`

## Deploy to GitHub Pages

1. Create a new GitHub repository.
2. Upload `index.html`, `styles.css`, `app.js`, and `README.md`.
3. In GitHub, open `Settings` -> `Pages`.
4. Under `Build and deployment`, choose `Deploy from a branch`.
5. Select your main branch and the `/ (root)` folder.
6. Save, then wait for GitHub Pages to publish the site.

## Local preview

You can open `index.html` directly in a browser, or serve the folder with a small local server.
