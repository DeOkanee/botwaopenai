// menambahkan dependencies
const {
  default: makeWASocket,
  DisconnectReason,
  useSingleFileAuthState,
} = require("@adiwajshing/baileys");
const { Boom } = require("@hapi/boom");
const { state, saveState } = useSingleFileAuthState("./login.json");

//bagian koding chat gtp
const { Configuration, OpenAIApi } = require("openai");
const configuration = new Configuration({
  apiKey: "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",
});
const openai = new OpenAIApi(configuration);

//Fungsi OpenAI ChatGPT untuk Mendapatkan Respon
async function generateResponse(text) {
  const response = await openai.createCompletion({
    model: "text-davinci-003",
    prompt: text,
    temperature: 0.3,
    max_tokens: 2000,
    top_p: 1.0,
    frequency_penalty: 0.0,
    presence_penalty: 0.0,
  });
  return response.data.choices[0].text;
}

// fungsi utama index wa bot
async function connectToWhatsApp() {
  //buat sebuat koneksi bari ke whatsapp
  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
    defaultQueryTimeoutMs: undefined,
  });

  //fungsi untuk cek koneksi update
  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === "close") {
      const shouldReconnect =
        (lastDisconnect.error = Boom)?.output?.statusCode !==
        DisconnectReason.loggedOut;
      console.log(
        "koneksi terputus karena",
        lastDisconnect.error,
        ",Hubungkan kembali",
        shouldReconnect
      );
      if (shouldReconnect) {
        connectToWhatsApp();
      }
    } else if (connection === "open") {
      console.log("koneksi tersambung");
    }
  });
  sock.ev.on("creds.update", saveState);

  //funsi untuk mantau pesan masuk
  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    console.log("Tipe Pesan: ", type);
    console.log(messages);
    if (type === "notify" && !messages[0].key.fromMe) {
      try {
        //dapatkan nomer pengirim dan isi pesan
        const senderNumber = messages[0].key.remoteJid;
        let incomingMessages = messages[0].message.conversation;
        if (incomingMessages === "") {
          incomingMessages = messages[0].message.extendedTextMessage.text;
        }
        incomingMessages = incomingMessages.toLowerCase();

        //dapatkan info pesan dari group atau bukan
        // dan pesan menyebut bot atau tidak
        const isMessageFromGroup = senderNumber.includes("@g.us");
        const isMessageMentionBot = incomingMessages.includes("@6281236091001");

        console.log("Nomer Pengirim: ", senderNumber);
        console.log("Isi Pesan: ", incomingMessages);

        //tampilkan status pesan dari group dan atau bukan
        // tampilkan status pesan menyebut bot atau tidak
        console.log("Apakah Pesan Dari Group ?", isMessageFromGroup);
        console.log("Apakah Pesan Menyebut Debot ?", isMessageMentionBot);

        if (!isMessageFromGroup) {
          //jika ada yang mengirim pesan mengandung pesan'siapa'
          if (
            incomingMessages.includes("siapa") &&
            incomingMessages.includes("kamu")
          ) {
            await sock.sendMessage(
              senderNumber,
              { text: "Saya Debot!" },
              { quoted: messages[0] },
              2000
            );
          } else {
            async function main() {
              const result = await generateResponse(incomingMessages);
              console.log(result);
              await sock.sendMessage(
                senderNumber,
                { text: result + "\n\n" },
                { quoted: messages[0] },
                2000
              );
            }
            main();
          }
        }

        //jika ada yang mengirim pesan ping
        if (incomingMessages === "ping") {
          await sock.sendMessage(
            senderNumber,
            { text: "pong!" },
            { quoted: messages[0] },
            2000
          );
        }

        if (incomingMessages === "katakan u") {
          await sock.sendMessage(
            senderNumber,
            { text: "uuwwuu... hahaha...." },
            { quoted: messages[0] },
            2000
          );
        }

        //Kalo misalkan nanya via Group
        if (isMessageFromGroup && isMessageMentionBot) {
          //Jika ada yang mengirim pesan mengandung kata 'siapa'
          if (
            incomingMessages.includes("siapa") &&
            incomingMessages.includes("kamu")
          ) {
            await sock.sendMessage(
              senderNumber,
              { text: "Saya Debot!" },
              { quoted: messages[0] },
              2000
            );
          } else {
            async function main() {
              const result = await generateResponse(incomingMessages);
              console.log(result);
              await sock.sendMessage(
                senderNumber,
                { text: result + "\n\n" },
                { quoted: messages[0] },
                2000
              );
            }
            main();
          }
        }
      } catch (error) {
        console.log(error);
      }
    }
  });
}

connectToWhatsApp().catch((err) => {
  console.log("Ada Error: " + err);
});
