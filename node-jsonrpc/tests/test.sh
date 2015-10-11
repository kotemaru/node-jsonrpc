wget -S -O out.json \
	--post-file=data1.json \
	--header="Content-type: application/json" \
	--header="Cookie: user=user1" \
	http://localhost:8000/apis 

cat out.json
