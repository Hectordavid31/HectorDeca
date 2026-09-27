(async function () {

  const SUPABASE_URL = "https://uqkmwdhzuqbsiusqeroa.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_pXTHMC3OrsO29fXit3_z5Q_usSHAG0o";

  const { createClient } =
    await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");

  const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
  );

  function crearCodigo(fecha) {
    const d = new Date(fecha || Date.now());

    const pad = n => String(n).padStart(2, "0");

    const fechaCodigo =
      d.getFullYear() +
      pad(d.getMonth() + 1) +
      pad(d.getDate());

    const horaCodigo =
      pad(d.getHours()) +
      pad(d.getMinutes()) +
      pad(d.getSeconds());

    const aleatorio =
      Math.random().toString(36).substring(2, 6).toUpperCase();

    return "HD-" + fechaCodigo + "-" + horaCodigo + "-" + aleatorio;
  }


  window.saveDeca = async function () {

    const ids = [
      "date",
      "sender",
      "senderNif",
      "senderAddress",
      "carrier",
      "carrierNif",
      "carrierAddress",
      "receiver",
      "receiverNif",
      "receiverAddress",
      "origin",
      "destination",
      "goods",
      "weight",
      "packages",
      "vehicle",
      "trailer",
      "notes"
    ];

    const d = {};

    ids.forEach(id => {
      const element = document.getElementById(id);
      d[id] = element ? element.value.trim() : "";
    });

    if (
      !d.sender ||
      !d.carrier ||
      !d.receiver ||
      !d.origin ||
      !d.destination ||
      !d.goods
    ) {
      alert("Completa los datos principales del DeCA.");
      return;
    }

    const decaCode = crearCodigo(d.date);

    const datos = {
      deca_code: decaCode,
      transport_date: d.date
        ? new Date(d.date).toISOString()
        : new Date().toISOString(),

      sender_name: d.sender,
      sender_nif: d.senderNif,
      sender_address: d.senderAddress,

      carrier_name: d.carrier,
      carrier_nif: d.carrierNif,
      carrier_address: d.carrierAddress,

      receiver_name: d.receiver,
      receiver_nif: d.receiverNif,
      receiver_address: d.receiverAddress,

      origin: d.origin,
      destination: d.destination,
      goods: d.goods,

      weight_kg: d.weight
        ? Number(d.weight.replace(",", "."))
        : null,

      packages: d.packages,

      vehicle_plate: d.vehicle,
      trailer_plate: d.trailer,

      notes: d.notes,
      status: "active"
    };

    try {

      const { data, error } = await supabase
        .from("decas")
        .insert(datos)
        .select("id,deca_code,public_token")
        .single();

      if (error) {
        console.error(error);
        alert(
          "No se pudo guardar el DeCA en el servidor.\n\n" +
          error.message
        );
        return;
      }

      d.id = data.deca_code;
      d.publicToken = data.public_token;

      d.publicUrl =
        SUPABASE_URL +
        "/functions/v1/deca-view?token=" +
        encodeURIComponent(data.public_token);

      const list =
        JSON.parse(
          localStorage.getItem("hectordeca") || "[]"
        );

      list.unshift(d);

      localStorage.setItem(
        "hectordeca",
        JSON.stringify(list)
      );

      alert(
        "DeCA guardado correctamente.\n\n" +
        data.deca_code
      );

      window.view(0);

    } catch (error) {

      console.error(error);

      alert(
        "Ha ocurrido un error al guardar el DeCA.\n\n" +
        error.message
      );
    }
  };


  const vistaOriginal = window.view;

  window.view = function (i) {

    vistaOriginal(i);

    const list =
      JSON.parse(
        localStorage.getItem("hectordeca") || "[]"
      );

    const d = list[i];

    if (!d || !d.publicUrl) return;

    const box =
      document.getElementById("detailContent");

    const qr =
      "https://quickchart.io/qr?size=220&margin=1&text=" +
      encodeURIComponent(d.publicUrl);

    box.insertAdjacentHTML(
      "beforeend",
      `
      <hr>

      <p>
        <strong>DeCA público:</strong>
      </p>

      <p>
        <a
          href="${d.publicUrl}"
          target="_blank"
          rel="noopener"
        >
          Abrir DeCA en Internet
        </a>
      </p>

      <p>
        <strong>QR del DeCA</strong>
      </p>

      <img
        src="${qr}"
        alt="QR del DeCA"
        style="width:220px;max-width:100%;"
      >

      <p style="word-break:break-all;font-size:12px;">
        ${d.publicUrl}
      </p>
      `
    );
  };

})();
