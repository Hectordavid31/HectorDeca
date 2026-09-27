
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

  function obtenerOwnerKey() {

    let key =
      localStorage.getItem("hectordeca_owner_key");

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

      publicUrl:
        row.public_token
          ? SUPABASE_URL +
            "/functions/v1/deca-view?token=" +
            encodeURIComponent(row.public_token)
          : ""
    };
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
        await supabase
          .rpc(
            "create_deca",
            {
              p_data: datos
            }
          )
          .single();

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

  window.loadHistory = async function () {

    const box =
      document.getElementById("list");

    if (!box) return;

    box.innerHTML =
      "<p>Cargando transportes...</p>";

    try {

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

            <strong>${d.id}</strong>

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

  window.deleteDeCa = async function(index) {

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
        "¿Seguro que quieres borrar " +
        d.id +
        "?"
      )
    ) return;

    const { data, error } =
      await supabase.rpc(
        "delete_deca",
        {
          p_owner_key: ownerKey,
          p_id: d.serverId
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
 window.view = function(i) {

    const lista =
      JSON.parse(
        localStorage.getItem(
          "hectordeca"
        ) || "[]"
      );

    const d = lista[i];

    if (!d) return;

    document.getElementById(
      "detailContent"
    ).innerHTML = `

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
              <strong>DeCA público</strong>
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
              <strong>QR</strong>
            </p>

            <img
              src="https://quickchart.io/qr?size=220&margin=1&text=${encodeURIComponent(d
 

   
    
   
  

    
