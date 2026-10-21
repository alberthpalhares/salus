#!/usr/bin/env bash
# Trava de consistência entre cérebro, skills, protocolo, templates e docs do Salus.
# Uso: bash scripts/check-docs.sh [raiz-do-repo]
# Sai com 1 se encontrar: resíduo de versão antiga / promessa falsa, skill citada no cérebro
# sem caminho na tabela, pasta de skill fora da tabela, campo do índice citado sem definição
# no template, arquivo de perfil/família citado sem template, ou versão desalinhada.
set -u
ROOT="${1:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "$ROOT" || exit 2

TEMPLATE="framework/.agents/skills/salus-onboarding/resources/SALUS_TEMPLATE.md"
INDEX="framework/.agents/skills/salus-onboarding/templates/Familia/_index.yaml"
PROTO="framework/Frameworks/PROTOCOLO_CLINICO.md"
TEMPLATES_DIR="framework/.agents/skills/salus-onboarding/templates"
SKILLS=(framework/.agents/skills/*/SKILL.md)
errors=0
fail() { echo "FALHA: $*"; errors=$((errors + 1)); }

# 1. Resíduos proibidos (campos removidos, formatos antigos, promessas que o código não sustenta)
residuos=$(grep -rn \
  -e 'alertas_cache' -e 'DD/MM/AAAA' -e '{{DATA_REVISAO}}' -e '{{LISTA_MEMBROS}}' \
  -e 'total privacidade' -e 'ChatGPT CLI' \
  --include='*.md' --include='*.yaml' --include='*.yml' --include='*.js' --include='*.ts' \
  --exclude-dir=.git --exclude-dir=graphify-out --exclude-dir=node_modules \
  --exclude-dir=docs --exclude-dir=scripts --exclude=CHANGELOG.md . 2>/dev/null || true)
if [ -n "$residuos" ]; then
  fail "resíduo proibido encontrado:"
  echo "$residuos"
fi

# 2. Toda skill citada no cérebro tem caminho na tabela; toda pasta de skill está na tabela
for s in $(grep -oE 'skill `[a-z-]+`' "$TEMPLATE" | sed -E 's/skill `([a-z-]+)`/\1/' | sort -u); do
  grep -q "\`.agents/skills/$s/SKILL.md\`" "$TEMPLATE" || fail "skill '$s' citada no cérebro sem caminho na tabela de skills"
done
for d in framework/.agents/skills/*/; do
  s=$(basename "$d")
  grep -q "\`.agents/skills/$s/SKILL.md\`" "$TEMPLATE" || fail "skill '$s' existe em .agents/skills/ mas não está na tabela do cérebro"
done

# 3. Todo campo com underscore citado em skills/cérebro/protocolo existe no template do índice
ALLOW=" nao_aplicavel "
for f in $(grep -rhoE '`[a-z]+(_[a-z]+)+`' "${SKILLS[@]}" "$TEMPLATE" "$PROTO" | tr -d '`' | sort -u); do
  case "$ALLOW" in *" $f "*) continue ;; esac
  grep -qE "(^|[^a-z_])$f:" "$INDEX" || fail "campo '$f' citado mas não definido em $INDEX"
done

# 4. Todo arquivo de perfil/família citado tem template correspondente
for p in $(grep -rhoE 'Perfis/\[Nome[^]/]*\]/[A-Za-z_]+\.md|Familia/[A-Za-z_]+\.(md|yaml)' \
  "${SKILLS[@]}" "$TEMPLATE" "$PROTO" README.md framework/COMECE_AQUI.md | sort -u); do
  base=$(basename "$p")
  ls "$TEMPLATES_DIR"/*/"$base" >/dev/null 2>&1 || fail "arquivo '$p' citado sem template em $TEMPLATES_DIR"
done

# 5. Versão alinhada: package.json × marcador do cérebro × README × framework/COMECE_AQUI
ver=$(node -p "require('./package.json').version")
grep -q "salus-template: $ver" "$TEMPLATE" || fail "marcador salus-template no cérebro difere da versão do package.json ($ver): $(head -1 "$TEMPLATE")"
grep -q "v$ver" README.md || fail "README.md não cita v$ver"
grep -q "v$ver" framework/COMECE_AQUI.md || fail "framework/COMECE_AQUI.md não cita v$ver"

if [ "$errors" -eq 0 ]; then
  echo "check-docs: OK"
  exit 0
fi
echo "check-docs: $errors falha(s)"
exit 1
