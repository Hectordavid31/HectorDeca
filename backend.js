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


  /* =====================================================
     IDENTIFICADOR DEL USUARIO
     ===================================================== */

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


  /* =====================================================
     HORA DE CANARIAS
     ===================================================== */

  function partesCanarias(fecha) {

    const partes =
      new Intl.DateTimeFormat("en-GB", {
        timeZone: "Atlantic/Canary",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23"
      }).formatToParts(new Date(fecha));

    const resultado = {};

    partes.forEach(p => {

      if (p.type !== "literal") {
        resultado[p.type] = p.value;
      }

    });

    return resultado;
  }


  function fechaHoraCanariasInput(
    fecha = new Date()
  ) {

    const p =
      partesCanarias(fecha);

    return (
      p.year +
      "-" +
      p.month +
      "-" +
      p.day +
      "T" +
      p.hour +
      ":" +
      p.minute
    );
  }


  function offsetCanarias(fecha) {

    const partes =
      new Intl.DateTimeFormat("en-US", {
        timeZone: "Atlantic/Canary",
        timeZoneName: "shortOffset"
      }).formatToParts(new Date(fecha));

    const zona =
      partes.find(
        p => p.type === "timeZoneName"
      )?.value || "GMT";

    if (
      zona === "GMT" ||
      zona === "UTC"
    ) {
      return 0;
    }

    const m =
      zona.match(
        /^GMT([+-])(\d{1,2})(?::(\d{2}))?$/
      );

    if (!m) return 0;

    const signo =
      m[1] === "+" ? 1 : -1;

    return (
      signo *
      (
        Number(m[2]) * 60 +
        Number(m[3] || 0)
      )
    );
  }


  function fechaInputCanariasAISO(valor) {

    if (!valor) {
      return new Date().toISOString();
    }

    const m =
      valor.match(
        /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/
      );

    if (!m) {
      return new Date(valor).toISOString();
    }

    const base =
      Date.UTC(
        Number(m[1]),
        Number(m[2]) - 1,
        Number(m[3]),
        Number(m[4]),
        Number(m[5]),
        0
      );

    let offset =
      offsetCanarias(
        new Date(base)
      );

    let utc =
      base -
      offset * 60000;

    const nuevoOffset =
      offsetCanarias(
        new Date(utc)
      );

    if (nuevoOffset !== offset) {

      offset = nuevoOffset;

      utc =
        base -
        offset * 60000;
    }

    return new Date(utc).toISOString();
  }


  function fechaISOACanarias(iso) {

    if (!iso) return "";

    return fechaHoraCanariasInput(
      new Date(iso)
    );
  }


  /* =====================================================
     CÓDIGO DECA
     ===================================================== */

  function crearCodigo(fecha) {

    const p =
      partesCanarias(
        fecha || new Date()
      );

    return (
      "HD-" +
      p.year +
      p.month +
      p.day +
      "-" +
      p.hour +
      p.minute +
      p.second +
      "-" +
      Math.random()
        .toString(36)
        .substring(2, 6)
        .toUpperCase()
    );
  }


  /* =====================================================
     SEGURIDAD HTML
     ===================================================== */

  function esc(valor) {

    return String(valor ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }


  /* =====================================================
     CONVERTIR DECA
     ===================================================== */

  function convertirDeCa(row) {

    return {

      id: row.deca_code,

      serverId: row.id,

      date:
        row.transport_date
          ? fechaISOACanarias(
              row.transport_date
            )
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

      publicUrl:
        row.public_token
          ? "https://hectordavid31.github.io/HectorDeca/deca.html?token=" +
            encodeURIComponent(
              row.public_token
            )
          : ""
    };
  }


  /* =====================================================
     GUARDAR DECA
     ===================================================== */

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
          ? fechaInputCanariasAISO(
              d.date
            )
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


  /* =====================================================
     MIS TRANSPORTES
     ===================================================== */

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


      renderTransportes(lista);

    } catch (error) {

      box.innerHTML =
        "<p>Error al cargar los transportes.</p>";

    }

  };


  /* =====================================================
     MOSTRAR TRANSPORTES
     ===================================================== */

  function renderTransportes(lista) {

    const box =
      document.getElementById("list");

    if (!box) return;


    if (!lista.length) {

      box.innerHTML =
        "<p>No se encontraron transportes.</p>";

      return;
    }


    box.innerHTML =
      lista.map(
        (d, i) => `

        <div class="item">

          <strong>
            ${esc(d.id)}
          </strong>

          ${esc(d.date || "")}
          <br>

          ${esc(d.origin)}
          →
          ${esc(d.destination)}

          <br>

          ${esc(d.goods)}

          ${
            d.vehicle
              ? `<br>🚛 ${esc(d.vehicle)}`
              : ""
          }

          <div class="actions">

            <button
              onclick="view(${i})"
            >
              Ver DeCA
            </button>

            <button
              style="
                background:#dc3545;
                color:white;
              "
              onclick="deleteDeCa(${i})"
            >
              🗑️ Borrar
            </button>

          </div>

        </div>

      `
      ).join("");

  }


  /* =====================================================
     BUSCADOR
     ===================================================== */

  window.filtrarTransportes = function () {

    const texto =
      (
        document.getElementById(
          "searchBox"
        )?.value || ""
      )
      .trim()
      .toLowerCase();


    const lista =
      JSON.parse(
        localStorage.getItem(
          "hectordeca"
        ) || "[]"
      );


    if (!texto) {

      renderTransportes(lista);

      return;
    }


    const filtrados =
      lista.filter(d => {

        const contenido = [

          d.id,
          d.date,
          d.sender,
          d.carrier,
          d.receiver,
          d.origin,
          d.destination,
          d.goods,
          d.vehicle,
          d.trailer,
          d.notes

        ]
        .join(" ")
        .toLowerCase();


        return contenido.includes(texto);

      });


    renderTransportes(filtrados);

  };


  /* =====================================================
     BORRAR DECA
     ===================================================== */

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


  /* =====================================================
     VER DECA
     ===================================================== */

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


    window.decaActual =
      d;


    box.innerHTML = `

      <p>
        <strong>ID:</strong>
        ${esc(d.id)}
      </p>

      <p>
        <strong>Fecha:</strong>
        ${esc(d.date)}
      </p>

      <hr>

      <p>
        <strong>Cargador:</strong><br>
        ${esc(d.sender)}<br>
        ${esc(d.senderNif)}<br>
        ${esc(d.senderAddress)}
      </p>

      <p>
        <strong>Transportista:</strong><br>
        ${esc(d.carrier)}<br>
        ${esc(d.carrierNif)}<br>
        ${esc(d.carrierAddress)}
      </p>

      <p>
        <strong>Destinatario:</strong><br>
        ${esc(d.receiver)}<br>
        ${esc(d.receiverNif)}<br>
        ${esc(d.receiverAddress)}
      </p>

      <hr>

      <p>
        <strong>Origen:</strong>
        ${esc(d.origin)}
      </p>

      <p>
        <strong>Destino:</strong>
        ${esc(d.destination)}
      </p>

      <p>
        <strong>Mercancía:</strong>
        ${esc(d.goods)}
      </p>

      <p>
        <strong>Peso:</strong>
        ${esc(d.weight)} kg
      </p>

      <p>
        <strong>Bultos:</strong>
        ${esc(d.packages)}
      </p>

      <p>
        <strong>Tractor:</strong>
        ${esc(d.vehicle)}
      </p>

      <p>
        <strong>Remolque:</strong>
        ${esc(d.trailer)}
      </p>

      <p>
        <strong>Observaciones:</strong>
        ${esc(d.notes)}
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
              href="${esc(d.publicUrl)}"
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


  /* =====================================================
     COMPARTIR DECA
     ===================================================== */

  window.compartirDeCa =
    async function() {

      const d =
        window.decaActual;


      if (!d || !d.publicUrl) {

        alert(
          "Este DeCA todavía no tiene un enlace público."
        );

        return;
      }


      try {

        if (
          navigator.share
        ) {

          await navigator.share({

            title:
              "DeCA " + d.id,

            text:
              "DeCA " +
              d.id +
              "\n" +
              d.origin +
              " → " +
              d.destination,

            url:
              d.publicUrl

          });

        } else {

          await navigator.clipboard.writeText(
            d.publicUrl
          );

          alert(
            "Enlace copiado. Ya puedes pegarlo donde quieras."
          );

        }

      } catch (error) {

        if (
          error.name !==
          "AbortError"
        ) {

          try {

            await navigator.clipboard.writeText(
              d.publicUrl
            );

            alert(
              "Enlace copiado."
            );

          } catch (e) {

            prompt(
              "Copia este enlace:",
              d.publicUrl
            );

          }

        }

      }

    };


  /* =====================================================
     CLIENTES
     ===================================================== */

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
                nombre.trim(),

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


  /* =====================================================
     VEHÍCULOS
     ===================================================== */

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
                tractor.trim().toUpperCase(),

              trailer_plate:
                remolque
                  ? remolque.trim().toUpperCase()
                  : ""

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


  /* =====================================================
     MERCANCÍAS
     ===================================================== */

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
                nombre.trim(),

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


  /* =====================================================
     CARGAR CATÁLOGOS
     ===================================================== */

  async function obtenerCatalogo(tipo) {

    try {

      const { data, error } =
        await supabase.rpc(
          "list_catalog",
          {

            p_owner_key:
              ownerKey,

            p_type:
              tipo

          }
        );


      if (error) {

        console.error(
          "Error catálogo:",
          error
        );

        return [];

      }


      return data || [];

    } catch (error) {

      console.error(error);

      return [];

    }

  }


  /* =====================================================
     RELLENAR FORMULARIO
     ===================================================== */

  window.cargarCatalogosFormulario =
    async function() {

      const clientes =
        await obtenerCatalogo(
          "clients"
        );


      const vehiculos =
        await obtenerCatalogo(
          "vehicles"
        );


      const mercancias =
        await obtenerCatalogo(
          "goods"
        );


      const clienteSelect =
        document.getElementById(
          "clientSelect"
        );


      const vehiculoSelect =
        document.getElementById(
          "vehicleSelect"
        );


      const goodsSelect =
        document.getElementById(
          "goodsSelect"
        );


      if (clienteSelect) {

        clienteSelect.innerHTML =
          `<option value="">
          — Seleccionar cliente —
          </option>`;


        clientes.forEach(c => {

          const option =
            document.createElement(
              "option"
            );

          option.value =
            JSON.stringify(c);

          option.textContent =
            c.name || "";

          clienteSelect.appendChild(
            option
          );

        });

      }


      if (vehiculoSelect) {

        vehiculoSelect.innerHTML =
          `<option value="">
          — Seleccionar vehículo —
          </option>`;


        vehiculos.forEach(v => {

          const option =
            document.createElement(
              "option"
            );

          option.value =
            JSON.stringify(v);

          option.textContent =
            (
              v.tractor_plate ||
              ""
            ) +
            (
              v.trailer_plate
                ? " + " +
                  v.trailer_plate
                : ""
            );

          vehiculoSelect.appendChild(
            option
          );

        });

      }


      if (goodsSelect) {

        goodsSelect.innerHTML =
          `<option value="">
          — Seleccionar mercancía —
          </option>`;


        mercancias.forEach(g => {

          const option =
            document.createElement(
              "option"
            );

          option.value =
            JSON.stringify(g);

          option.textContent =
            g.name || "";

          goodsSelect.appendChild(
            option
          );

        });

      }

    };


  /* =====================================================
     USAR CLIENTE
     ===================================================== */

  window.usarCliente =
    function(valor) {

      if (!valor) return;


      try {

        const c =
          JSON.parse(valor);


        const sender =
          document.getElementById(
            "sender"
          );

        const nif =
          document.getElementById(
            "senderNif"
          );

        const address =
          document.getElementById(
            "senderAddress"
          );


        if (sender)
          sender.value =
            c.name || "";


        if (nif)
          nif.value =
            c.nif || "";


        if (address)
          address.value =
            c.address || "";


      } catch (error) {

        console.error(error);

      }

    };


  /* =====================================================
     USAR VEHÍCULO
     ===================================================== */

  window.usarVehiculo =
    function(valor) {

      if (!valor) return;


      try {

        const v =
          JSON.parse(valor);


        const tractor =
          document.getElementById(
            "vehicle"
          );

        const trailer =
          document.getElementById(
            "trailer"
          );


        if (tractor)
          tractor.value =
            v.tractor_plate || "";


        if (trailer)
          trailer.value =
            v.trailer_plate || "";


      } catch (error) {

        console.error(error);

      }

    };


  /* =====================================================
     USAR MERCANCÍA
     ===================================================== */

  window.usarMercancia =
    function(valor) {

      if (!valor) return;


      try {

        const g =
          JSON.parse(valor);


        const goods =
          document.getElementById(
            "goods"
          );

        const weight =
          document.getElementById(
            "weight"
          );

        const packages =
          document.getElementById(
            "packages"
          );


        if (goods)
          goods.value =
            g.name || "";


        if (
          weight &&
          g.default_weight_kg != null
        )
          weight.value =
            g.default_weight_kg;


        if (
          packages &&
          g.default_packages != null
        )
          packages.value =
            g.default_packages;


      } catch (error) {

        console.error(error);

      }

    };


  /* =====================================================
     INICIO
     ===================================================== */

  setTimeout(
    function() {

      if (
        window.cargarCatalogosFormulario
      ) {

        window.cargarCatalogosFormulario();

      }

    },
    500
  );


})();
