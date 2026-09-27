(async function () {

  const SUPABASE_URL =
    "https://uqkmwdhzuqbsiusqeroa.supabase.co";

  const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_pXTHMC3OrsO29fXit3_z5Q_usSHAG0o";

  const { createClient } = await import(
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
     CÓDIGO DECA
     ========================= */

  function crearCodigo(fecha) {

    const d = new Date(fecha || Date.now());

    const pad = n =>
      String(n).padStart(2, "0");

    return (
      "HD-" +
      d.getFullYear() +
      pad(d.getMonth() + 1) +
      pad(d.getDate()) +
      "-" +
      pad(d.getHours()) +
      pad(d.getMinutes()) +
      pad(d.getSeconds()) +
      "-" +
      Math.random()
        .toString(36)
        .substring(2, 6)
        .toUpperCase()
    );
  }


  /* =========================
     CONVERTIR DECA
     ========================= */

  function convertirDeCa(row) {

    return {

      id: row.deca_code,

      serverId: row.id,

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
        row.weight_kg != null
          ? String(row.weight_kg)
          : "",

      packages: row.packages || "",

      vehicle: row.vehicle_plate || "",
      trailer: row.trailer_plate || "",

      notes: row.notes || "",

      publicToken: row.public_token || "",

      /*
       * IMPORTANTE:
       * El QR ahora apunta a GitHub Pages,
       * no directamente a la Edge Function de Supabase.
       */

      publicUrl:
        row.public_token
          ? "https://hectordavid31.github.io/HectorDeca/deca.html?token=" +
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

      const el =
        document.getElementById(id);

      d[id] =
        el ? el.value.trim() : "";
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


    const datos = {

      deca_code:
        crearCodigo(d.date),

      owner_key:
        ownerKey,

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
        await supabase.rpc(
          "create_deca",
          {
            p_data: datos
          }
        ).single();


      if (error) {

        alert(
          "No se pudo guardar el DeCA:\n\n" +
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

      alert(
        "Error:\n\n" +
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

      const { data, error } =
        await supabase.rpc(
          "list_my_decas",
          {
            p_owner_key:
              ownerKey
          }
        );


      if (error) {

        box.innerHTML =
          "<p>Error al cargar los transportes.</p>";

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
        lista.map(
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

            <button
              onclick="deleteDeCa(${i})"
              style="
                background:#dc3545;
                color:white;
                margin-left:6px;
              "
            >
              🗑️ Borrar
            </button>

          </div>

        `
        ).join("");


    } catch (error) {

      box.innerHTML =
        "<p>Error al cargar los transportes.</p>";
    }
  };


  /* =========================
     BORRAR DECA
     ========================= */

  window.deleteDeCa =
    async function(index) {

      const lista =
        JSON.parse(
          localStorage.getItem(
            "hectordeca"
          ) || "[]"
        );


      const d = lista[index];


      if (!d || !d.serverId) {

        alert(
          "No se puede borrar este DeCA."
        );

        return;
      }


      if (
        !confirm(
          "¿Seguro que quieres borrar\n" +
          d.id +
          "?"
        )
      ) return;


      const { data, error } =
        await supabase.rpc(
          "delete_deca",
          {
            p_owner_key:
              ownerKey,

            p_id:
              d.serverId
          }
        );


      if (error || !data) {

        alert(
          "No se pudo borrar el DeCA."
        );

        return;
      }


      await window.loadHistory();


      show("history");
    };


  /* =========================
     VER DECA
     ========================= */

  window.view = function(index) {

    const lista =
      JSON.parse(
        localStorage.getItem(
          "hectordeca"
        ) || "[]"
      );


    const d = lista[index];


    if (!d) return;


    const box =
      document.getElementById(
        "detailContent"
      );


    box.innerHTML = `

      <p>
        <strong>ID:</strong>
        ${d.id}
      </p>

      <p>
        <strong>Fecha:</strong>
        ${d.date}
      </p>

      <hr>

      <p>
        <strong>Cargador:</strong><br>
        ${d.sender}<br>
        ${d.senderNif}<br>
        ${d.senderAddress}
      </p>

      <p>
        <strong>Transportista:</strong><br>
        ${d.carrier}<br>
        ${d.carrierNif}<br>
        ${d.carrierAddress}
      </p>

      <p>
        <strong>Destinatario:</strong><br>
        ${d.receiver}<br>
        ${d.receiverNif}<br>
        ${d.receiverAddress}
      </p>

      <hr>

      <p>
        <strong>Origen:</strong>
        ${d.origin}
      </p>

      <p>
        <strong>Destino:</strong>
        ${d.destination}
      </p>

      <p>
        <strong>Mercancía:</strong>
        ${d.goods}
      </p>

      <p>
        <strong>Peso:</strong>
        ${d.weight} kg
      </p>

      <p>
        <strong>Bultos:</strong>
        ${d.packages}
      </p>

      <p>
        <strong>Tractor:</strong>
        ${d.vehicle}
      </p>

      <p>
        <strong>Remolque:</strong>
        ${d.trailer}
      </p>

      <p>
        <strong>Observaciones:</strong>
        ${d.notes}
      </p>

      ${
        d.publicUrl
          ? `

          <hr>

          <p>
            <strong>
              DeCA público
            </strong>
          </p>

          <p>
            <a
              href="${d.publicUrl}"
              target="_blank"
              rel="noopener"
            >
              🌐 Abrir DeCA en Internet
            </a>
          </p>

          <p>
            <strong>
              QR del DeCA
            </strong>
          </p>

          <img
            src="https://quickchart.io/qr?size=220&margin=1&text=${encodeURIComponent(d.publicUrl)}"
            style="
              width:220px;
              max-width:100%;
            "
          >

          `
          : ""
      }

    `;


    show("detail");
  };


  /* =========================
     CLIENTES
     ========================= */

  window.nuevoCliente =
    async function() {

      const nombre =
        prompt(
          "Nombre del cliente:"
        );

      if (!nombre) return;


      const nif =
        prompt("NIF:");


      const direccion =
        prompt("Dirección:");


      const { error } =
        await supabase.rpc(
          "save_catalog",
          {

            p_owner_key:
              ownerKey,

            p_type:
              "clients",

            p_data: {

              kind:
                "client",

              name:
                nombre,

              nif:
                nif || "",

              address:
                direccion || ""
            }
          }
        );


      if (error) {

        alert(
          "Error:\n\n" +
          error.message
        );

        return;
      }


      alert(
        "Cliente guardado correctamente."
      );
    };


  /* =========================
     VEHÍCULOS
     ========================= */

  window.nuevoVehiculo =
    async function() {

      const tractor =
        prompt(
          "Matrícula del tractor:"
        );


      if (!tractor) return;


      const remolque =
        prompt(
          "Matrícula del remolque:"
        );


      const { error } =
        await supabase.rpc(
          "save_catalog",
          {

            p_owner_key:
              ownerKey,

            p_type:
              "vehicles",

            p_data: {

              tractor_plate:
                tractor,

              trailer_plate:
                remolque || ""
            }
          }
        );


      if (error) {

        alert(
          "Error:\n\n" +
          error.message
        );

        return;
      }


      alert(
        "Vehículo guardado correctamente."
      );
    };


  /* =========================
     MERCANCÍAS
     ========================= */

  window.nuevaMercancia =
    async function() {

      const nombre =
        prompt(
          "Descripción de la mercancía:"
        );


      if (!nombre) return;


      const peso =
        prompt(
          "Peso habitual en kg:"
        );


      const bultos =
        prompt(
          "Bultos habituales:"
        );


      const { error } =
        await supabase.rpc(
          "save_catalog",
          {

            p_owner_key:
              ownerKey,

            p_type:
              "goods",

            p_data: {

              name:
                nombre,

              default_weight_kg:
                peso || "",

              default_packages:
                bultos || ""
            }
          }
        );


      if (error) {

        alert(
          "Error:\n\n" +
          error.message
        );

        return;
      }


      alert(
        "Mercancía guardada correctamente."
      );
    };


  /* =========================
     MENÚ DE GESTIÓN
     ========================= */

  function crearMenu() {

    const home =
      document.getElementById(
        "home"
      );


    if (!home) return;


    if (
      document.getElementById(
        "menuGestion"
      )
    ) return;


    const menu =
      document.createElement(
        "div"
      );


    menu.id =
      "menuGestion";


    menu.innerHTML = `

      <hr>

      <h2>
        Gestión
      </h2>

      <button
        class="secondary"
        onclick="nuevoCliente()"
      >
        👥 Clientes habituales
      </button>

      <br><br>

      <button
        class="secondary"
        onclick="nuevoVehiculo()"
      >
        🚛 Vehículos
      </button>

      <br><br>

      <button
        class="secondary"
        onclick="nuevaMercancia()"
      >
        📦 Mercancías habituales
      </button>

    `;


    home.appendChild(menu);
  }


  /* =========================
     INICIO
     ========================= */

  setTimeout(
    crearMenu,
    800
  );

})();
