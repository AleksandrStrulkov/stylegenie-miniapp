# Юридические документы (Markdown)

Источник для Mini App и API: **`.md`** в этой папке.

| Файл | `?doc=` в Mini App |
|------|-------------------|
| `public_offer.md` | `terms` |
| `policy_personal.md` | `privacy` |
| `consent_personal.md` | `consent` |

## Редактирование

Редактируйте **`.md`** напрямую. Поддерживается в просмотре:

- `#` заголовок 1, `##` раздел, `###` пункт
- **жирный**, *курсив*
- списки `- пункт`
- `---` горизонтальная линия
- `> цитата` (blockquote)

Файлы `.txt` — прежняя версия; при необходимости пересобрать черновик из txt:

```bash
py scripts/convert_legal_txt_to_md.py
```

После правок — push в репозиторий GitHub Pages (workflow `github-pages-legal.yml`).
