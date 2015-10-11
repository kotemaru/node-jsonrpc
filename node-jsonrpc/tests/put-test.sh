wget -S -O out.json --method PUT \
	--content-on-error \
	--body-file=put-data.js \
	--header="Content-type: text/plain; charset=utf8" \
	--header="Cookie: user=user1" \
	http://localhost:8000/apis/users/user1/put-data.js 

cat out.json


