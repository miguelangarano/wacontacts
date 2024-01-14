<script lang="ts">
  import { createForm } from "felte";
  import {
    Button,
    DarkMode,
    Heading,
    Input,
    Label,
    Modal,
    Table,
    TableBody,
    TableBodyCell,
    TableBodyRow,
    TableHead,
    TableHeadCell,
    P,
  } from "flowbite-svelte";
  import {
    MessagesSolid,
    UserRemoveSolid,
    ExclamationCircleOutline,
  } from "flowbite-svelte-icons";
  import { Notyf } from "notyf";
  import "notyf/notyf.min.css";
  import { onMount } from "svelte";
  import { parsePhoneNumberFromString } from "libphonenumber-js";
  import { validator } from "@felte/validator-yup";
  import * as yup from "yup";

  type Contact = {
    name: string;
    phoneNumber: string;
    description?: string;
  };

  const notyf = new Notyf();
  let db: any;
  let contactFormModalOpen = false;
  let confirmationModalOpen = false;
  let firstDbRequest = true;
  let contacts: Contact[] = [];

  let confirmationModalData = {
    description: "",
    accept: () => {},
    cancel: () => {},
  };

  onMount(() => {
    openDatabase();
  });

  $: if (db && firstDbRequest) {
    firstDbRequest = false;
    getAllData();
  }

  // Define a validation schema using Yup
  const schema = yup.object({
    phoneNumber: yup
      .string()
      .required("El teléfono el requerido")
      .test(
        "Valid phone number",
        "El teléfono no es válido",
        (phoneNumber: string) => isValidPhoneNumber(phoneNumber)
      ),
  });

  const { form, errors } = createForm({
    async onSubmit(values, context) {
      console.log(values);
      return await createContact(values);
    },
    onSuccess(response, context) {
      // Do something with the returned value from `onSubmit`.
      notyf.success("Contacto agregado.");
      closeContactFormModal();
      getAllData();
    },
    onError(err, context) {
      // Do something with the error thrown from `onSubmit`.
      notyf.error("Error al agregar contacto.");
    },
    extend: validator({ schema }),
  });

  function openChat(phoneNumber: string) {
    window.open(
      `https://api.whatsapp.com/send?phone=${phoneNumber.replace("+", "")}`,
      "_self"
    );
  }

  function openContactFormModal() {
    contactFormModalOpen = true;
  }

  function closeContactFormModal() {
    contactFormModalOpen = false;
  }

  function openConfirmationModal() {
    confirmationModalOpen = true;
  }

  function closeConfirmationModal() {
    confirmationModalOpen = false;
  }

  function isValidPhoneNumber(phoneNumber: string) {
    const phone = parsePhoneNumberFromString(phoneNumber);
    return phone ? phone.isValid() : false;
  }

  function setConfirmationModalData(
    description: string,
    accept: () => void,
    cancel: () => void
  ) {
    confirmationModalData = {
      description,
      accept,
      cancel,
    };
  }

  function openDatabase() {
    const request = indexedDB.open("WaContactsDB", 1);

    request.onerror = function (event) {
      notyf.error("Error guardando el contacto");
      console.error("Error guardando el contacto");
    };

    request.onupgradeneeded = function (event: any) {
      db = event?.target?.result;

      // Create an object store named "books" if it doesn't exist.
      db.createObjectStore("contacts", {
        keyPath: "phoneNumber",
      });
    };

    request.onsuccess = function (event: any) {
      db = event?.target?.result;
    };
  }

  async function createContact({ name, phoneNumber, description }: Contact) {
    const transaction = db.transaction(["contacts"], "readwrite");
    const objectStore = transaction.objectStore("contacts");

    try {
      const request = objectStore.add({
        name,
        phoneNumber: phoneNumber.trim().replaceAll(" ", ""),
        description,
      });
      await new Promise((resolve, reject) => {
        request.onsuccess = resolve;
        request.onerror = reject;
      });
      console.log("Contacto agregado.", request.result);
      return true;
    } catch (error) {
      console.error("Error al agregar contacto.", error);
      throw new Error();
    }
  }

  async function getAllData() {
    const transaction = db.transaction(["contacts"], "readonly");
    const objectStore = transaction.objectStore("contacts");

    try {
      const request = objectStore.getAll();
      const result: any[] = await new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      console.log("Data retrieved from the database:", result);
      contacts = result;
    } catch (error) {
      console.error("Error reading data from the database:", error);
      throw error;
    }
  }

  async function deleteContact(phoneNumber: string) {
    const transaction = db.transaction(["contacts"], "readwrite");
    const objectStore = transaction.objectStore("contacts");

    try {
      const request = objectStore.delete(phoneNumber);
      await new Promise<void>((resolve, reject) => {
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      console.log("Contacto eliminado");
      notyf.success("Contacto eliminado");
      getAllData();
    } catch (error) {
      console.error("Error eliminando contacto: ", error);
      notyf.error("Error eliminando contacto.");
      throw error;
    }
  }

  function requestDeleteContact({ name, phoneNumber, description }: Contact) {
    setConfirmationModalData(
      `Estás seguro de eliminar a ${name}, ${phoneNumber}, ${description}`,
      () => deleteContact(phoneNumber),
      () => {}
    );
    openConfirmationModal();
  }
</script>

<head>
  <link
    rel="stylesheet"
    href="https://cdn.jsdelivr.net/npm/notyf@3/notyf.min.css"
  />
</head>

<DarkMode />
<main class="w-screen flex flex-col p-3">
  <div class="flex w-full justify-center text-center mb-12">
    <Heading
      tag="h2"
      customSize="text-4xl font-extrabold text-[#04a784]"
      color=""
    >
      WaContacts
    </Heading>
  </div>

  <div class="flex w-full justify-end mb-6">
    <Button color="light" on:click={openContactFormModal}>
      Agregar Contacto +
    </Button>
  </div>

  {#if contacts.length === 0}
    <div class="flex w-full justify-center">
      <P size="lg">Agrega un contacto a tu lista</P>
    </div>
  {:else}
    <div class="flex w-full overflow-scroll">
      <Table divClass="w-full">
        <TableHead>
          <TableHeadCell>Nombre</TableHeadCell>
          <TableHeadCell>Número</TableHeadCell>
          <TableHeadCell>Descripción</TableHeadCell>
          <TableHeadCell></TableHeadCell>
        </TableHead>
        <TableBody>
          {#each contacts as contact}
            <TableBodyRow>
              <TableBodyCell>{contact.name}</TableBodyCell>
              <TableBodyCell>{contact.phoneNumber}</TableBodyCell>
              <TableBodyCell>{contact.description}</TableBodyCell>
              <TableBodyCell>
                <Button
                  color="blue"
                  on:click={() => openChat(contact.phoneNumber)}
                  ><MessagesSolid /></Button
                >
                <Button
                  type="button"
                  color="red"
                  on:click={() => requestDeleteContact(contact)}
                  ><UserRemoveSolid /></Button
                >
              </TableBodyCell>
            </TableBodyRow>
          {/each}
        </TableBody>
      </Table>
    </div>
  {/if}

  <Modal
    bind:open={contactFormModalOpen}
    size="xs"
    autoclose={false}
    class="w-full"
  >
    <form use:form class="flex flex-col space-y-6">
      <h3 class="mb-4 text-xl font-medium text-gray-900 dark:text-white">
        Registra un nuevo contacto
      </h3>
      <Label class="space-y-2">
        <span>Nombre</span>
        <Input type="text" name="name" placeholder="Juan García" required />
      </Label>
      <Label class="space-y-2">
        <span>Teléfono</span>
        <Input
          type="text"
          name="phoneNumber"
          placeholder="+593987654321"
          required
        />
        {#if $errors.phoneNumber}
          <span class="error">{$errors.phoneNumber}</span>
        {/if}
      </Label>
      <Label class="space-y-2">
        <span>Descripción</span>
        <Input type="text" name="description" placeholder="Contador/Florería" />
      </Label>
      <Button type="submit" class="w-full1">Crear</Button>
    </form>
  </Modal>

  <Modal bind:open={confirmationModalOpen} size="xs" autoclose>
    <div class="text-center">
      <ExclamationCircleOutline
        class="mx-auto mb-4 text-gray-400 w-12 h-12 dark:text-gray-200"
      />
      <h3 class="mb-5 text-lg font-normal text-gray-500 dark:text-gray-400">
        {confirmationModalData.description}
      </h3>
      <Button
        color="red"
        class="me-2"
        on:click={() => {
          closeConfirmationModal();
          confirmationModalData.accept();
        }}>Aceptar</Button
      >
      <Button
        color="alternative"
        on:click={() => {
          closeConfirmationModal();
          confirmationModalData.cancel();
        }}>Cancelar</Button
      >
    </div>
  </Modal>
</main>
