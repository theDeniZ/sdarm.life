# for f in himnario-adventista.json es-hr.json hymnal-ru.json gezangen-zions.json louvores-ao-rei.json ta-tt.json ta-sig.json trm-hymnal.json hymnal-rw.json hymnes-et-louanges.json ta-tt-ro.json ta-sig-ro.json reformation-hymnal-v2.json; do
#    echo "=== Importing $f ===" && \
#    npx tsx scripts/import-hymnal.ts \
#      --client-id "e60d811a1cc92e5f4e3f0fa974b4046c.access" \
#      --client-secret "c2b398e3b9abab29712f9d42f5ead0f877d22f4d3b74f68911a93bb2f5600785" \
#      --api-url "http://localhost:8787" \
#      --file "$f" || echo "FAILED: $f"; 
# done

# for f in hymnal-ru.json; do
#    echo "=== Importing $f ===" && \
#    npx tsx scripts/import-hymnal.ts --client-id "e60d811a1cc92e5f4e3f0fa974b4046c.access" --client-secret "c2b398e3b9abab29712f9d42f5ead0f877d22f4d3b74f68911a93bb2f5600785" --file "$f" || echo "FAILED: $f"; 
# done
