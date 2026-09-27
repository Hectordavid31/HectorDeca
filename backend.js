(async function () {

  const SUPABASE_URL =
    "https://uqkmwdhzuqbsiusqeroa.supabase.co";

  const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_pXTHMC3OrsO29fXit3_z5Q_usSHAG0o";

  const { createClient } =
    await import(
      "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm"
    );

  const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
  );


  /* =========================
     IDENTIFICADOR DEL USUARIO
     ========================= */

  function obtenerOwnerKey() {

    let key = localStorage.getItem(
      "hectordeca_owner_key"
    );

    if (!key) {

      const bytes = new Uint8Array(32);

      crypto.getRandomValues(bytes);

      key = Array.from(bytes)
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");

      localStorage.setItem(
        "hectordeca_owner_key",
        key
      );
    }

    return key;
  }


  const ownerKey = obtenerOwnerKey();


  /* =========================
     CÓDIGO DEL DECA
     ========================= */

  function crearCodigo(fecha) {

    const d = new Date(fecha || Date.now());

    const pad = n =>
      String(n).padStart(2, "0");

    const fechaCodigo =
      d.getFullYear() +
      pad(d.getMonth() + 1) +
      pad(d.getDate());

    const horaCodigo =
      pad(d.getHours()) +
      pad(d.getMinutes()) +
      pad(d.getSeconds());

    const aleatorio =
      Math.random()
        .toString(36)
        .substring(2, 6)
        .toUpperCase();

    return (
      "HD-" +
      fechaCodigo +
      "-" +
      horaCodigo +
      "-" +
      aleatorio
    );
  }


  /* =========================
     CONVERTIR DECA DE SUPABASE
     ========================= */

  function convertirDeCa(row) {

    return {

      id: row.deca_code,

      date: row.transport_date
        ? new Date(row.transport_date)
            .toISOString()
            .slice(0, 16)
        : "",

      sender: row.sender_name || "",
      senderNif: row.sender_nif || "",
      senderAddress: row.sender_address || "",

      carrier: row.carrier_name || "",
      carrierNif: row.carrier_nif || "",
      carrierAddress: row.carrier_address || "",

      receiver: row.receiver_name || "",
      receiverNif: row.receiver_nif || "",
      receiverAddress: row.receiver_address || "",

      origin: row.origin || "",
      destination: row.destination || "",

      goods: row.goods || "",

      weight:
        row.weight_kg !== null &&
        row.weight_kg !== undefined
          ? String(row.weight_kg)
          : "",

      packages: row.packages || "",

      vehicle: row.vehicle_plate || "",
      trailer: row.trailer_plate || "",

      notes: row.notes || "",

      publicToken: row.public_token || "",

      publicUrl:
        row.public_token
          ? SUPABASE_URL +
            "/functions/v1/deca-view?token=" +
            encodeURIComponent(row.public_token)
          : ""
    };
  }


  /* =========================
     GUARDAR DECA
     ========================= */

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

      const element =
        document.getElementById(id);

      d[id] =
        element
          ? element.value.trim()
          : "";
    });


    if (
      !d.sender ||
      !d.carrier ||
      !d.receiver ||
      !d.origin ||
      !d.destination ||
      !d.goods
    ) {

      alert(
        "Completa los datos principales del DeCA."
      );

      return;
    }


    const decaCode =
      crearCodigo(d.date);


    const datos = {

      deca_code: decaCode,

      owner_key: ownerKey,

      transport_date:
        d.date
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

      weight_kg:
        d.weight
          ? Number(
              d.weight.replace(",", ".")
            )
          : null,

      packages: d.packages,

      vehicle_plate: d.vehicle,
      trailer_plate: d.trailer,

      notes: d.notes,

      status: "active"
    };


    try {

      const { data, error } =
        await supabase
          .rpc(
            "create_deca",
            {
              p_data: datos
            }
          )
          .single();


      if (error) {

        console.error(error);

        alert(
          "No se pudo guardar el DeCA en el servidor.\n\n" +
          error.message
        );

        return;
      }


      alert(
        "DeCA guardado correctamente.\n\n" +
        data.deca_code
      );


      await window.loadHistory();


      const lista =
        JSON.parse(
          localStorage.getItem(
            "hectordeca"
          ) || "[]"
        );

      if (lista.length) {

        window.view(0);

      } else {

        show("home");

      }


    } catch (error) {

      console.error(error);

      alert(
        "Ha ocurrido un error al guardar el DeCA.\n\n" +
        error.message
      );
    }
  };


  /* =========================
     MIS TRANSPORTES
     ========================= */

  window.loadHistory = async function () {

    const box =
      document.getElementById("list");


    if (!box) return;


    box.innerHTML =
      "<p>Cargando transportes...</p>";


    try {

      /*
       * Intentamos recuperar primero
       * los DeCA antiguos que estaban
       * guardados solamente en el móvil.
       */

      const locales =
        JSON.parse(
          localStorage.getItem(
            "hectordeca"
          ) || "[]"
        );


      for (const local of locales) {

        if (
          local.publicToken
        ) {

          await supabase.rpc(
            "claim_deca",
            {
              p_public_token:
                local.publicToken,

              p_owner_key:
                ownerKey
            }
          );
        }
      }


      /*
       * Recuperar todos los DeCA
       * pertenecientes a este móvil.
       */

      const { data, error } =
        await supabase
          .rpc(
            "list_my_decas",
            {
              p_owner_key:
                ownerKey
            }
          );


      if (error) {

        console.error(error);

        box.innerHTML =
          "<p>No se pudieron cargar los transportes.</p>";

        return;
      }


      const lista =
        (data || [])
          .map(convertirDeCa);


      localStorage.setItem(
        "hectordeca",
        JSON.stringify(lista)
      );


      if (!lista.length) {

        box.innerHTML =
          "<p>Aún no hay transportes guardados.</p>";

        return;
      }


      box.innerHTML =
        lista
          .map(
            (d, i) => `
              <div class="item">

                <strong>
                  ${d.id}
                </strong>

                ${d.date || ""}<br>

                ${d.origin}
                →
                ${d.destination}<br>

                ${d.goods}

                <br><br>

                <button
                  onclick="view(${i})"
                >
                  Ver DeCA
                </button>

              </div>
            `
          )
          .join("");


    } catch (error) {

      console.error(error);

      box.innerHTML =
        "<p>Error al cargar los transportes.</p>";
    }
  };


  /* =========================
     VER DECA + QR
     ========================= */

  const vistaOriginal =
    window.view;


  window.view = function (i) {

    vistaOriginal(i);


    const lista =
      JSON.parse(
        localStorage.getItem(
          "hectordeca"
        ) || "[]"
      );


    const d = lista[i];


    if (
      !d ||
      !d.publicUrl
    ) return;


    const box =
      document.getElementById(
        "detailContent"
      );


    const qr =
      "https://quickchart.io/qr?size=220&margin=1&text=" +
      encodeURIComponent(
        d.publicUrl
      );


    box.insertAdjacentHTML(
      "beforeend",

      `
      <hr>

      <p>
        <strong>
          DeCA público:
        </strong>
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
        <strong>
          QR del DeCA
        </strong>
      </p>

      <img
        src="${qr}"
        alt="QR del DeCA"
        style="
          width:220px;
          max-width:100%;
        "
      >

      <p
        style="
          word-break:break-all;
          font-size:12px;
        "
      >
        ${d.publicUrl}
      </p>
      `
    );
  };


})();
