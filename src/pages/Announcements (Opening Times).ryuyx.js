import { fetch } from "wix-fetch";

$w.onReady(async function () {
    const response = await fetch(`https://api-staging.mountproxies.com/api/notifications?page=1&limit=5`, {
        method: "GET",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Authorization": `JWT eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2NvdW50X2NyZWF0aW9uX3N1cnZleV9jb21wbGV0ZWQiOmZhbHNlLCJiYWNrX3RvX3N0cmlwZSI6ZmFsc2UsInJlc2VsbGVyIjpudWxsLCJ1c2VyX3R5cGUiOiJNUCIsIl9pZCI6IjYzMTFlMjlmYzVkYjA5MmExY2ViYWY0ZiIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJyb2NrX3BvaW50cyI6NTA3LCJpcF9yb3RhdGlvbl9lbWFpbF9ub3RpZmljYXRpb24iOmZhbHNlLCJyb2NrcG9pbnRzX2Vhcm5lZF9lbWFpbF9ub3RpZmljYXRpb24iOmZhbHNlLCJyb2NrcG9pbnRzX3NwZW50X2VtYWlsX25vdGlmaWNhdGlvbiI6ZmFsc2UsInJvY2twb2ludHNfbmV3c19lbWFpbF9ub3RpZmljYXRpb24iOmZhbHNlLCJzZW5kX2ZyYXVkX2NvbmZpcm1fZW1haWwiOmZhbHNlLCJ0cmVsbG9fdXJsIjpudWxsLCJkaXNhYmxlX2NyZWRpdF9yZW1pbmRlcl9lbWFpbCI6ZmFsc2UsImRpc2FibGVfaXByb3RhdGlvbl9yYXRlX2xpbWl0aW5nIjpmYWxzZSwiZW1haWxfc2VudF9mb3JfdmlkZW9fdHV0b3JpYWwiOmZhbHNlLCJlbWFpbCI6InZpc2hhbGdhcmdAc3RheWNpcmNsZXMuY29tIiwicGFzc3dvcmQiOiIkMmEkMTAkSmFnT0FHV05qSGZQTXRCM3Q5MG1lZTE5U1dGdER3aGRuLkR4YmxLcmFYRTRwd2RHZC9uUEsiLCJjcmVhdGVkX2F0IjoiMjAyMi0wOS0wMlQxMTowMTo1MS4xMDhaIiwidXBkYXRlZF9hdCI6IjIwMjQtMTItMDJUMDc6MjA6MjMuMTY2WiIsIl9fdiI6MCwiYXBpX2tleSI6IjNmMWU2MzExZTI5ZmM1ZGIwOTJhMWNlYmFmNGYxMjY4IiwiY29uZmlybWF0aW9uX3Rva2VuIjpudWxsLCJyZXNldF9wYXNzd29yZF90b2tlbiI6IjYzMTFlMjlmYzVkYjA5MmExY2ViYWY0ZmZiZjZkODg2NWM1OWNjOWUxNzc0NjYwYjQ5NWUyZGIyYzM5OGNjYzY3MjUwMjA3MjQ2NWVmN2E4YWFmMCIsInJlc2V0X3Bhc3N3b3JkX2F0IjoiMjAyMi0wOS0wMlQxMTozMTo1MS4yMTFaIiwiY29uZmlybWVkX2F0IjoiMjAyMi0wOS0wMlQxMTozMTo1MS41NDRaIiwic3RyaXBlX2N1c3RvbWVyX2lkIjoiY3VzX01VMzVMQ3U4Zk9pTEFnIiwic3RyaXBlX2N1c3RvbWVyX2NoZWNrb3V0X2VtYWlsIjoidmlzaGFsZ2FyZ0BzdGF5Y2lyY2xlcy5jb20iLCJtcF9tYW5hZ2VkX3N1YnNjcmlwdGlvbiI6dHJ1ZSwibGFzdF9hY3RpdmVfYXQiOiIyMDI0LTEyLTAyVDA3OjIwOjIzLjE2NVoiLCJjcmVkaXRfYmFsYW5jZSI6OTI2LCJsYXN0X3Zpc2l0X3RvX2NoZWNrb3V0X3BhZ2VfYXQiOiIyMDI0LTExLTMwVDA5OjM3OjQxLjQ1OVoiLCJsb2NrZWRfZm9yX3N1YnNjcmlwdGlvbl9wdXJjaGFzZSI6ZmFsc2UsImxhc3Rfc3Vic2NyaXB0aW9uX3B1cmNoYXNlZF9hdCI6IjIwMjQtMTEtMzBUMDk6Mzc6MzkuMjg3WiIsInVzZXJfaWQiOiJPQTgzVkE3V1VIRTIiLCJpYXQiOjE3MzMyMDk0MzgsImV4cCI6MTczMzgxNDIzOH0.EtMRj31hRbzwr_d0Y--9T9TkCyhcJbl4G7cZnu6p500`
        },
    })

    const { data } = await response.json()

    console.log("data>>>>>>>>>>>>>>>>>>>>>...", data);

	const repeterData = data.map(d=>(
		{
			_id: d.id,
			heading:d.attributes.key,
			para: d.attributes["popup-notification-body"]
		}
		))

	$w('#repeater').data = repeterData
    $w('#repeater').onItemReady(($item, itemData) => {
        $item('#heading').text = itemData.heading
        $item('#para').html = `<p>${itemData.para}</p>`
    })

});